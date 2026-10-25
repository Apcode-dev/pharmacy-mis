package com.akash.medicalinventory;

import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Ensure window decor fits system windows so WebView starts directly below the status bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // 2. Prevent any double-inset padding on the content view or its layout children
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.setPadding(0, 0, 0, 0);
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                v.setPadding(0, 0, 0, 0);
                if (v instanceof ViewGroup) {
                    ViewGroup vg = (ViewGroup) v;
                    for (int i = 0; i < vg.getChildCount(); i++) {
                        View child = vg.getChildAt(i);
                        if (child != null) {
                            child.setPadding(0, 0, 0, 0);
                        }
                    }
                }
                return windowInsets;
            });
        }
    }
}
