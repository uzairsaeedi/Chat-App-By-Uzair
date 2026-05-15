// components/ErrorBoundary.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import { logError } from '../utils/errorHandler';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.appStateSubscription = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidMount() {
    // Auto-reset error state when app comes back to foreground
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && this.state.hasError) {
        console.log('[ErrorBoundary] App resumed, auto-resetting error state');
        this.setState({ hasError: false, error: null });
      }
    });
  }

  componentWillUnmount() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }

  componentDidCatch(error, errorInfo) {
    logError(error, 'ErrorBoundary');
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>
            We're sorry for the inconvenience. Please try again.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.errorText}>
              {this.state.error.toString()}
            </Text>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ErrorBoundary;
