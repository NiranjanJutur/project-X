import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';

// In a real development environment, you would use your local IP address
const VITE_DEV_SERVER_URL = 'http://192.168.1.103:5173/'; 

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0e1a" />
      <View style={styles.content}>
        <WebView 
          source={{ uri: VITE_DEV_SERVER_URL }} 
          style={styles.webview}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView received error: ', nativeEvent);
          }}
          renderError={() => (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Could not connect to Vite Dev Server.</Text>
              <Text style={styles.errorHint}>Make sure your dev server is running with 'npm run dev -- --host' and update the URL in App.tsx.</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0e1a',
  },
  content: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#0b0e1a',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0b0e1a',
  },
  errorText: {
    color: '#ff7d5d',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorHint: {
    color: '#eaeff7',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  }
});
