package com.akash.medicalinventory;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // 1. Enable Edge-to-Edge display so system windows dispatch safe-area insets to WebView
        WindowCompat.setDecorFitsSystemWindows(window, false);

        // 2. Set dark status bar background (matching reference image #09122C)
        window.setStatusBarColor(Color.parseColor("#09122C"));

        // 3. Ensure white/light status bar icons (time, battery, wifi) are visible on the dark background
        WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, window.getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(false);
        }
    }
}
