export const storageKeys = {
  localStorage: {
    chatMode: 'chat-mode',
    chatModel: 'chat-model',
    contentEngineView: 'content-engine-view',
  },
  reactQuery: {
    contentItem: (itemId: string) => ['content-item', itemId],
    contentItems: ['content-items'],
    contentItemsStatus: (status: string) => ['content-items', 'status', status],
    contentItemsDateRange: (startDate: string, endDate: string) => ['content-items', 'date-range', startDate, endDate],
    scriptChatSessions: ['script-chat-sessions'],
    scriptChatSession: (sessionId: string) => ['script-chat-session', sessionId],
    scriptChatMessages: (sessionId: string) => ['script-chat-messages', sessionId],
  }
} as const;
