import React, { useState } from 'react';
import { StyleSheet, StatusBar, ActivityIndicator, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  // CONFIG: Replace with your actual deployed URL or Local IP
  // e.g. 'http://192.168.1.5:5173' for local testing
  const PRODUCT_URL = 'https://eco-blocks-pec-hackathon-ypr6.vercel.app'; 

  const [isLoading, setIsLoading] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />
      
      <View style={styles.webviewContainer}>
        <WebView 
          source={{ uri: PRODUCT_URL }} 
          style={{ flex: 1, backgroundColor: '#000' }}
          
          // Performance & Features
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          allowsInlineMediaPlayback={true} // Essential for ElevenLabs Audio
          mediaPlaybackRequiresUserAction={false}
          
          // Loading Handler
          onLoadEnd={() => setIsLoading(false)}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#00ff88" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  }
});