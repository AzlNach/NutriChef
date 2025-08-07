# Frontend Structure Documentation

## Folder Structure

```
src/
├── components/          # Reusable components
│   ├── common/         # Common UI components (Button, Modal, etc.)
│   ├── layout/         # Layout components (Header, Footer, Navigation)
│   ├── auth/           # Authentication related components
│   ├── food/           # Food analysis and display components
│   ├── nutrition/      # Nutrition tracking components
│   └── ui/             # Base UI components
├── pages/              # Route/Page components
├── hooks/              # Custom React hooks
├── services/           # API service functions
├── context/            # React Context providers
├── utils/              # Utility functions and constants
├── styles/             # Global CSS files
└── assets/             # Static assets (images, icons)
```

## Import Guidelines

### Components
```javascript
// Use named imports from index files
import { Button, Modal } from '../components/common';
import { HomePage, AuthPage } from '../pages';
import { EnhancedImageUpload } from '../components/food';
```

### Services
```javascript
import { foodService, authService } from '../services';
```

### Utils
```javascript
import { formatDate, validateImageFile, API_CONFIG } from '../utils';
```

### Context
```javascript
import { useAuth } from '../context/AuthContext';
```

## Best Practices

1. **Component Organization**: Group related components in feature-based folders
2. **Index Files**: Use index.js files for cleaner imports
3. **Naming Convention**: Use PascalCase for components, camelCase for functions
4. **File Structure**: Keep related files close together
5. **Context Usage**: Use context for global state management
6. **Utils**: Extract reusable logic into utility functions

## Key Features

- **Centralized State**: AuthContext for authentication state
- **Utility Functions**: Common helpers for API calls, file validation, etc.
- **Constants**: Centralized configuration and error messages
- **Modular Components**: Easy to import and reuse across the app
- **Clean Imports**: Index files enable shorter import paths
