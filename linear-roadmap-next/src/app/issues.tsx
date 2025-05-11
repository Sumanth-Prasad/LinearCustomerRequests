// Sample issues data with type information
export const MOCK_ISSUES = [
  { 
    id: "issue1", 
    title: "Customer Location Link Implementation",
    state: { id: "todo", name: "Todo" },
    priority: 4, // Urgent
    type: "feature",
    assignee: { id: "user1", name: "John Doe" }
  },
  { 
    id: "issue2", 
    title: "Model Variation Consolidation",
    state: { id: "in-progress", name: "In Progress" },
    priority: 3, // High
    type: "improvement",
    assignee: null
  },
  { 
    id: "issue3", 
    title: "Front-End Web Testing for 404 Errors",
    state: { id: "in-review", name: "In Review" },
    priority: 2, // Medium
    type: "bug",
    assignee: { id: "user2", name: "Jane Smith" }
  },
  { 
    id: "issue4", 
    title: "Image Order Changes During Editing",
    state: { id: "todo", name: "Todo" },
    priority: 4, // Urgent
    type: "bug",
    assignee: { id: "user3", name: "Mike Johnson" }
  },
  { 
    id: "issue5", 
    title: "Missing Images in Vehicle Edit Mode",
    state: { id: "in-progress", name: "In Progress" },
    priority: 3, // High
    type: "bug",
    assignee: { id: "user1", name: "John Doe" }
  },
  { 
    id: "issue6", 
    title: "Vans Subcategory Implementation",
    state: { id: "in-review", name: "In Review" },
    priority: 1, // Low
    type: "feature",
    assignee: { id: "user2", name: "Jane Smith" }
  },
  { 
    id: "issue7", 
    title: "Vehicle Count Display",
    state: { id: "done", name: "Done" },
    priority: 4, // Urgent
    type: "improvement",
    assignee: null
  },
  { 
    id: "issue8", 
    title: "New Cars Subcategory Needed",
    state: { id: "todo", name: "Todo" },
    priority: 3, // High
    type: "feature",
    assignee: { id: "user3", name: "Mike Johnson" }
  }
]; 