package com.hotelpos.rfidpos

import android.content.Context
import android.content.Intent
import android.nfc.NfcAdapter
import android.os.Build
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.widget.Toast

import android.print.PrintManager
import android.webkit.WebView

class WebAppInterface(private val context: Context, private val webView: WebView) {

    /**
     * Check if NFC is enabled on the device.
     * Returns "enabled", "disabled", or "not_supported"
     */
    @JavascriptInterface
    fun checkNfcStatus(): String {
        val nfcAdapter = NfcAdapter.getDefaultAdapter(context)
        return when {
            nfcAdapter == null -> "not_supported"
            !nfcAdapter.isEnabled -> "disabled"
            else -> "enabled"
        }
    }

    /**
     * Open NFC settings.
     */
    @JavascriptInterface
    fun openNfcSettings() {
        try {
            val intent = Intent(Settings.ACTION_NFC_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            try {
                val intent = Intent(Settings.ACTION_WIRELESS_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } catch (ex: Exception) {
                Toast.makeText(context, "NFC ayarları açılamadı", Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * Show a native Android toast message.
     */
    @JavascriptInterface
    fun showToast(message: String) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
    }

    /**
     * Vibrate the device for the given milliseconds.
     */
    @JavascriptInterface
    fun vibrate(milliseconds: Long) {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        
        if (vibrator.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(android.os.VibrationEffect.createOneShot(milliseconds, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(milliseconds)
            }
        }
    }

    /**
     * Returns a unique hardware identifier for the device (useful for POS licensing).
     */
    @JavascriptInterface
    fun getDeviceHardwareId(): String {
        return Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown_device_id"
    }

    /**
     * Print the current WebView contents.
     */
    @JavascriptInterface
    fun printPage() {
        webView.post {
            try {
                val printManager = context.getSystemService(Context.PRINT_SERVICE) as? PrintManager
                if (printManager != null) {
                    val jobName = "RFIDPOS Receipt"
                    val printAdapter = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        webView.createPrintDocumentAdapter(jobName)
                    } else {
                        @Suppress("DEPRECATION")
                        webView.createPrintDocumentAdapter()
                    }
                    printManager.print(jobName, printAdapter, android.print.PrintAttributes.Builder().build())
                } else {
                    Toast.makeText(context, "Yazdırma servisi bulunamadı", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Yazdırma hatası: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
