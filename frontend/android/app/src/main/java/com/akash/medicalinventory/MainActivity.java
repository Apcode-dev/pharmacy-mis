package com.akash.medicalinventory;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // 1. Ensure window decor fits system windows on all Android versions
        WindowCompat.setDecorFitsSystemWindows(window, true);

        // 2. Set Status Bar background to white and icons to dark for optimal visibility
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.WHITE);

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(true); // Dark icons (clock, battery, Wi-Fi) on white status bar
        }

        // 3. Robust insets listener on the root content view for ALL Android versions (including API 35+)
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                Insets insets = windowInsets.getInsets(
                    WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()
                );
                int topInset = insets.top;
                if (topInset == 0) {
                    topInset = getStatusBarHeight();
                }
                v.setPadding(0, topInset, 0, 0);
                return windowInsets;
            });

            // Immediate initial padding fallback to prevent any layout jump
            int initialHeight = getStatusBarHeight();
            if (initialHeight > 0) {
                contentView.setPadding(0, initialHeight, 0, 0);
            }
        }
    }

    private int getStatusBarHeight() {
        int result = 0;
        int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resourceId > 0) {
            result = getResources().getDimensionPixelSize(resourceId);
        }
        return result;
    }
}
