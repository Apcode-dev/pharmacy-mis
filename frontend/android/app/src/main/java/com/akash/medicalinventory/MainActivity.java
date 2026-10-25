package com.akash.medicalinventory;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure window fits system decor so WebView sits completely below the Android status bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // For edge-to-edge rendering on modern Android (including API 35+),
        // ensure status bar and camera cutout insets are respected with padding.
        if (Build.VERSION.SDK_INT >= 35) {
            View contentView = findViewById(android.R.id.content);
            if (contentView != null) {
                ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                    Insets insets = windowInsets.getInsets(
                        WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()
                    );
                    v.setPadding(0, insets.top, 0, 0);
                    return windowInsets;
                });
            }
        }
    }
}
