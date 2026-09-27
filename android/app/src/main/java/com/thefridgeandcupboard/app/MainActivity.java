package com.thefridgeandcupboard.app;

import android.os.Bundle;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android WebView blocks programmatic audio unless this is disabled.
        // Chef Super J needs this for the same hands-free greeting + spoken
        // response flow that already works on iPhone.
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebSettings settings = getBridge().getWebView().getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            // Ensure the web content fits the Android screen automatically at
            // the correct size — matches the iPhone layout so users never
            // have to pinch to zoom out on Android.
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setSupportZoom(false);
            settings.setTextZoom(100);
        }

    }
}
