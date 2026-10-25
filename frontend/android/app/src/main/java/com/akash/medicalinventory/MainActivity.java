package com.akash.medicalinventory;

import android.os.Bundle;
import android.view.View;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure window decor fits system windows so the WebView starts immediately below the status bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // Clear any manual padding on the root content view to eliminate unnecessary header gaps
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.setPadding(0, 0, 0, 0);
            contentView.setOnApplyWindowInsetsListener(null);
        }
    }
}
