import { createTheme } from '@mui/material/styles'

// Material Design 3 color tokens
const lightColorTokens = {
  // Primary Color Palette (Chat Brand)
  primary: {
    main: '#006C51',
    light: '#5EDA9E',
    dark: '#00513C',
    contrastText: '#FFFFFF'
  },
  
  // Secondary Color Palette (Supporting)
  secondary: {
    main: '#4C635B',
    light: '#B2CCC2',
    dark: '#344B43',
    contrastText: '#FFFFFF'
  },
  
  // Tertiary Color Palette (Accent)
  tertiary: {
    main: '#3F6375',
    light: '#C4E8FD',
    dark: '#001F29',
    contrastText: '#FFFFFF'
  },
  
  // Error Colors
  error: {
    main: '#BA1A1A',
    light: '#FFDAD6',
    dark: '#410002',
    contrastText: '#FFFFFF'
  },
  
  // Neutral Colors
  background: {
    default: '#FAFDF9',
    paper: '#FFFFFF'
  },
  
  surface: {
    main: '#FAFDF9',
    variant: '#DBE5DD',
    container: {
      lowest: '#FFFFFF',
      low: '#F4F7F3',
      main: '#EEF1ED',
      high: '#E8EBE7',
      highest: '#E2E5E1'
    }
  },
  
  // Text Colors
  text: {
    primary: '#191C1A',
    secondary: '#404943',
    disabled: '#707973'
  },
  
  // Chat-Specific Colors
  chat: {
    outgoing: '#006C51',
    outgoingContainer: '#7CF7D0',
    incoming: '#EEF1ED',
    incomingContainer: '#E8EBE7',
    timestamp: '#707973'
  }
}

const darkColorTokens = {
  // Primary Dark
  primary: {
    main: '#5EDA9E',
    light: '#7CF7D0',
    dark: '#00382A',
    contrastText: '#00382A'
  },
  
  // Secondary Dark
  secondary: {
    main: '#B2CCC2',
    light: '#CEE9DE',
    dark: '#1D352D',
    contrastText: '#1D352D'
  },
  
  // Tertiary Dark
  tertiary: {
    main: '#A8CCE1',
    light: '#C4E8FD',
    dark: '#001F29',
    contrastText: '#001F29'
  },
  
  // Error Dark
  error: {
    main: '#FFB4AB',
    light: '#FFDAD6',
    dark: '#410002',
    contrastText: '#410002'
  },
  
  // Background Dark
  background: {
    default: '#0F1511',
    paper: '#171D19'
  },
  
  surface: {
    main: '#0F1511',
    variant: '#404943',
    container: {
      lowest: '#0A0F0C',
      low: '#171D19',
      main: '#1B211D',
      high: '#252B27',
      highest: '#303632'
    }
  },
  
  // Text Colors Dark
  text: {
    primary: '#E2E5E1',
    secondary: '#BFC9C1',
    disabled: '#707973'
  },
  
  // Chat Colors Dark
  chat: {
    outgoing: '#5EDA9E',
    outgoingContainer: '#00513C',
    incoming: '#252B27',
    incomingContainer: '#1B211D',
    timestamp: '#BFC9C1'
  }
}

// Material Design 3 Typography Scale
const typography = {
  fontFamily: '"Roboto", "Arial", sans-serif',
  
  // Display Typography
  displayLarge: {
    fontSize: '57px',
    lineHeight: '64px',
    fontWeight: 400,
    letterSpacing: '-0.25px'
  },
  displayMedium: {
    fontSize: '45px',
    lineHeight: '52px',
    fontWeight: 400,
    letterSpacing: '0px'
  },
  displaySmall: {
    fontSize: '36px',
    lineHeight: '44px',
    fontWeight: 400,
    letterSpacing: '0px'
  },
  
  // Headline Typography
  headlineLarge: {
    fontSize: '32px',
    lineHeight: '40px',
    fontWeight: 400,
    letterSpacing: '0px'
  },
  headlineMedium: {
    fontSize: '28px',
    lineHeight: '36px',
    fontWeight: 400,
    letterSpacing: '0px'
  },
  headlineSmall: {
    fontSize: '24px',
    lineHeight: '32px',
    fontWeight: 400,
    letterSpacing: '0px'
  },
  
  // Title Typography
  titleLarge: {
    fontSize: '22px',
    lineHeight: '28px',
    fontWeight: 500,
    letterSpacing: '0px'
  },
  titleMedium: {
    fontSize: '16px',
    lineHeight: '24px',
    fontWeight: 500,
    letterSpacing: '0.15px'
  },
  titleSmall: {
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 500,
    letterSpacing: '0.1px'
  },
  
  // Label Typography
  labelLarge: {
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 500,
    letterSpacing: '0.1px'
  },
  labelMedium: {
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: 500,
    letterSpacing: '0.5px'
  },
  labelSmall: {
    fontSize: '11px',
    lineHeight: '16px',
    fontWeight: 500,
    letterSpacing: '0.5px'
  },
  
  // Body Typography
  bodyLarge: {
    fontSize: '16px',
    lineHeight: '24px',
    fontWeight: 400,
    letterSpacing: '0.15px'
  },
  bodyMedium: {
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 400,
    letterSpacing: '0.25px'
  },
  bodySmall: {
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: 400,
    letterSpacing: '0.4px'
  }
}

// Material Design 3 Shape System
const shape = {
  borderRadius: 12 // Medium corner radius
}

// Material Design 3 Elevation Shadows
const shadows = [
  'none',
  '0px 1px 2px 0px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)', // Elevation 1
  '0px 1px 2px 0px rgba(0,0,0,0.3), 0px 2px 6px 2px rgba(0,0,0,0.15)', // Elevation 2
  '0px 4px 8px 3px rgba(0,0,0,0.15), 0px 1px 3px 0px rgba(0,0,0,0.3)', // Elevation 3
  '0px 6px 10px 4px rgba(0,0,0,0.15), 0px 2px 3px 0px rgba(0,0,0,0.3)', // Elevation 4
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)', // Elevation 5
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)',
  '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)'
]

// Motion tokens for Material Design 3 Expressive
const motion = {
  duration: {
    short1: 50,
    short2: 100,
    short3: 150,
    short4: 200,
    medium1: 250,
    medium2: 300,
    medium3: 350,
    medium4: 400,
    long1: 450,
    long2: 500
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0.0, 0, 1.0)',
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
    emphasized: 'cubic-bezier(0.2, 0.0, 0, 1.0)'
  }
}

// Create light theme
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    ...lightColorTokens
  },
  typography,
  shape,
  shadows,
  
  // Component customizations for Material Design 3
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '20px', // Pill-shaped buttons
          textTransform: 'none',
          fontWeight: 500,
          letterSpacing: '0.1px',
          padding: '10px 24px',
          transition: `all ${motion.duration.short4}ms ${motion.easing.standard}`
        },
        containedPrimary: {
          backgroundColor: lightColorTokens.primary.main,
          color: lightColorTokens.primary.contrastText,
          '&:hover': {
            backgroundColor: lightColorTokens.primary.dark,
            boxShadow: '0px 2px 4px 0px rgba(0,0,0,0.3), 0px 1px 10px 0px rgba(0,0,0,0.15)'
          }
        }
      }
    },
    
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: '0px 4px 8px 3px rgba(0,0,0,0.15), 0px 1px 3px 0px rgba(0,0,0,0.3)',
          transition: `all ${motion.duration.medium2}ms ${motion.easing.emphasized}`
        }
      }
    },
    
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          backgroundImage: 'none'
        },
        elevation1: {
          backgroundColor: lightColorTokens.surface.container.low
        },
        elevation2: {
          backgroundColor: lightColorTokens.surface.container.main
        },
        elevation3: {
          backgroundColor: lightColorTokens.surface.container.high
        }
      }
    },
    
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '4px',
            '& fieldset': {
              borderColor: lightColorTokens.text.disabled
            },
            '&:hover fieldset': {
              borderColor: lightColorTokens.text.secondary
            },
            '&.Mui-focused fieldset': {
              borderColor: lightColorTokens.primary.main,
              borderWidth: '2px'
            }
          }
        }
      }
    },
    
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: lightColorTokens.primary.main,
          color: lightColorTokens.primary.contrastText,
          boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.3), 0px 2px 6px 2px rgba(0,0,0,0.15)'
        }
      }
    },
    
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          margin: '4px 0',
          '&:hover': {
            backgroundColor: lightColorTokens.surface.container.high
          }
        }
      }
    },
    
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)'
        }
      }
    }
  },
  
  // Custom properties
  custom: {
    motion,
    chat: lightColorTokens.chat
  }
})

// Create dark theme
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    ...darkColorTokens
  },
  typography,
  shape,
  shadows: shadows.map(shadow => 
    shadow.replace(/rgba\(0,0,0,/g, 'rgba(0,0,0,')
  ),
  
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '20px',
          textTransform: 'none',
          fontWeight: 500,
          letterSpacing: '0.1px',
          padding: '10px 24px',
          transition: `all ${motion.duration.short4}ms ${motion.easing.standard}`
        },
        containedPrimary: {
          backgroundColor: darkColorTokens.primary.main,
          color: darkColorTokens.primary.contrastText,
          '&:hover': {
            backgroundColor: darkColorTokens.primary.light,
            boxShadow: '0px 2px 4px 0px rgba(0,0,0,0.3), 0px 1px 10px 0px rgba(0,0,0,0.15)'
          }
        }
      }
    },
    
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          backgroundColor: darkColorTokens.primary.main,
          color: darkColorTokens.primary.contrastText,
          boxShadow: '0px 4px 8px 3px rgba(0,0,0,0.15), 0px 1px 3px 0px rgba(0,0,0,0.3)'
        }
      }
    },
    
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          backgroundImage: 'none',
          backgroundColor: darkColorTokens.surface.container.main
        },
        elevation1: {
          backgroundColor: darkColorTokens.surface.container.low
        },
        elevation2: {
          backgroundColor: darkColorTokens.surface.container.main
        },
        elevation3: {
          backgroundColor: darkColorTokens.surface.container.high
        }
      }
    },
    
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '4px',
            '& fieldset': {
              borderColor: darkColorTokens.text.disabled
            },
            '&:hover fieldset': {
              borderColor: darkColorTokens.text.secondary
            },
            '&.Mui-focused fieldset': {
              borderColor: darkColorTokens.primary.main,
              borderWidth: '2px'
            }
          }
        }
      }
    },
    
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: darkColorTokens.primary.main,
          color: darkColorTokens.primary.contrastText
        }
      }
    },
    
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          margin: '4px 0',
          '&:hover': {
            backgroundColor: darkColorTokens.surface.container.high
          }
        }
      }
    }
  },
  
  custom: {
    motion,
    chat: darkColorTokens.chat
  }
})

// Export both themes and utilities
export { motion, typography, lightColorTokens, darkColorTokens }