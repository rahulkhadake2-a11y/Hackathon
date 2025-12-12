import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiChatService, ChatMessage } from '../../../core/services/ai-chat/ai-chat.service';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.css']
})
export class AiChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  isOpen = false;
  isMinimized = false;
  isTyping = false;
  userMessage = '';
  messages: ChatMessage[] = [];
  
  quickSuggestions = [
    'Total suppliers',
    'Total products',
    'Accounts payable',
    'Product status'
  ];

  constructor(private aiChatService: AiChatService) {}

  ngOnInit(): void {
    // Load conversation history
    this.messages = this.aiChatService.getConversationHistory();
    
    // If no history, add welcome message
    if (this.messages.length === 0) {
      this.addWelcomeMessage();
    }
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    this.isMinimized = false;
    if (this.isOpen) {
      setTimeout(() => {
        this.messageInput?.nativeElement?.focus();
      }, 100);
    }
  }

  minimizeChat(): void {
    this.isMinimized = !this.isMinimized;
  }

  closeChat(): void {
    this.isOpen = false;
    this.isMinimized = false;
  }

  sendMessage(): void {
    const message = this.userMessage.trim();
    if (!message) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: this.generateId(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };
    this.messages.push(userMsg);
    this.aiChatService.addToHistory(userMsg);
    
    // Clear input
    this.userMessage = '';
    
    // Show typing indicator
    this.isTyping = true;
    
    // Process query
    this.aiChatService.processQuery(message).subscribe({
      next: (response) => {
        this.isTyping = false;
        this.messages.push(response);
        this.aiChatService.addToHistory(response);
      },
      error: (err) => {
        this.isTyping = false;
        const errorMsg: ChatMessage = {
          id: this.generateId(),
          type: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        };
        this.messages.push(errorMsg);
      }
    });
  }

  useSuggestion(suggestion: string): void {
    this.userMessage = suggestion;
    this.sendMessage();
  }

  useQuickSuggestion(suggestion: string): void {
    this.userMessage = suggestion;
    this.sendMessage();
  }

  clearChat(): void {
    this.aiChatService.clearHistory();
    this.messages = [];
    this.addWelcomeMessage();
  }

  private addWelcomeMessage(): void {
    const welcomeMsg: ChatMessage = {
      id: this.generateId(),
      type: 'assistant',
      content: `👋 **Hello! I'm your ERP Assistant.**

Ask me anything about your vendors, orders, inventory, or risks in plain English!

For example:
• "Show me top 5 vendors"
• "What are pending orders?"
• "Which items are low on stock?"

Type **help** for more options.`,
      timestamp: new Date(),
      suggestions: ['Show top vendors', 'Pending orders', 'Risk summary', 'Help']
    };
    this.messages.push(welcomeMsg);
    this.aiChatService.addToHistory(welcomeMsg);
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  formatMessage(content: string): string {
    // Convert markdown-style bold to HTML
    return content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/_(.+?)_/g, '<em>$1</em>');
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
