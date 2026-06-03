package com.hotelpos.rfidpos

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Build
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var nfcAdapter: NfcAdapter? = null
    private var pendingIntent: PendingIntent? = null

    // Target URL - Change this to your production URL when deploying
    private val targetUrl = "https://rfidpos.vercel.app/login"

    // Broadcast receiver for specific hand-held terminals (Sunmi, iMin, etc.)
    private val rfidBroadcastReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            intent?.let {
                val action = it.action
                // Common extras used by handheld POS scanners to send the scanned ID
                val cardUid = it.getStringExtra("data") 
                    ?: it.getStringExtra("rfid_uid") 
                    ?: it.getStringExtra("value")
                    ?: it.getStringExtra("barcode") // Some scanners treat RFID as barcode input
                
                if (!cardUid.isNullOrEmpty()) {
                    sendCardUidToWeb(cardUid)
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        setupWebView()

        // Setup custom back button handling (Android 13+)
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        // Initialize standard Android NFC Adapter
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        val intent = Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        pendingIntent = PendingIntent.getActivity(this, 0, intent, flags)
    }

    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        // Set custom User Agent so Next.js server knows it's the Android app
        val defaultUserAgent = settings.userAgentString
        settings.userAgentString = "$defaultUserAgent RFIDPOS-Android"

        // Open links in WebView instead of external browser
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                url?.let { view?.loadUrl(it) }
                return true
            }
        }
        webView.webChromeClient = WebChromeClient()

        // Inject JS Bridge
        webView.addJavascriptInterface(WebAppInterface(this, webView), "AndroidBridge")

        // Load application URL
        webView.loadUrl(targetUrl)
    }

    override fun onResume() {
        super.onResume()
        // Enable NFC foreground dispatch
        nfcAdapter?.enableForegroundDispatch(this, pendingIntent, null, null)

        // Register broadcast receivers for handheld terminals
        val filter = IntentFilter().apply {
            addAction("com.sunmi.rfid.ACTION_SCAN_RESULT")
            addAction("com.sunmi.rfid.read")
            addAction("android.intent.action.SCANRESULT")
            addAction("com.android.server.scannerservice.broadcast")
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(rfidBroadcastReceiver, filter, RECEIVER_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(rfidBroadcastReceiver, filter)
        }
    }

    override fun onPause() {
        super.onPause()
        // Disable NFC foreground dispatch
        nfcAdapter?.disableForegroundDispatch(this)

        // Unregister broadcast receivers
        try {
            unregisterReceiver(rfidBroadcastReceiver)
        } catch (e: Exception) {
            // Already unregistered
        }
    }

    // Capture standard Android NFC scans
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        resolveIntent(intent)
    }

    private fun resolveIntent(intent: Intent) {
        val action = intent.action
        if (NfcAdapter.ACTION_TAG_DISCOVERED == action || 
            NfcAdapter.ACTION_TECH_DISCOVERED == action || 
            NfcAdapter.ACTION_NDEF_DISCOVERED == action) {
            
            val tag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
            }

            tag?.let {
                val cardUid = it.id.toHexString()
                sendCardUidToWeb(cardUid)
            }
        }
    }

    private fun sendCardUidToWeb(cardUid: String) {
        // Run JavaScript handleRFIDCard function on main thread
        runOnUiThread {
            webView.evaluateJavascript("if (typeof window.handleRFIDCard === 'function') { window.handleRFIDCard('$cardUid'); }", null)
        }
    }

    // Helper extension to convert ByteArray to Hex string
    private fun ByteArray.toHexString(): String {
        return joinToString("") { "%02X".format(it) }
    }
}
