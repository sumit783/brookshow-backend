import { ENV } from "../config/env.js";

console.log("--- Supabase Configuration Diagnostics ---");

const url = ENV.SUPABASE_URL;
const key = ENV.SUPABASE_ANON_KEY;

if (!url) {
    console.error("❌ SUPABASE_URL is Missing or Empty");
} else {
    console.log(`✅ SUPABASE_URL is present. Length: ${url.length}`);
    console.log(`   Value (first 15 chars): ${url.substring(0, 15)}...`);
    if (!url.startsWith("http")) console.warn("   ⚠️ Warning: URL does not start with http/https");
}

if (!key) {
    console.error("❌ SUPABASE_ANON_KEY is Missing or Empty");
} else {
    console.log(`✅ SUPABASE_ANON_KEY is present. Length: ${key.length}`);
    if (!key.startsWith("ey")) {
        console.warn("   ⚠️ Warning: Key does not start with 'ey'. It usually should be a JWT.");
        console.log(`   Value (first 5 chars): ${key.substring(0, 5)}...`);
    } else {
        console.log(`   Value (first 5 chars): ${key.substring(0, 5)}...`);
    }
}

if (url && key) {
    console.log("\nAttempting to initialize Supabase client...");
    try {
        const { supabase } = await import("../config/supabaseClient.js");

        // Try to sign in with a fake account to force a network request
        // This should return "Invalid login credentials" if the Key is VALID.
        // It will return "Invalid API key" if the Key is INVALID.
        console.log("Testing signInWithPassword with dummy credentials...");
        const { data, error } = await supabase.auth.signInWithPassword({
            email: "diagnostic_dummy@example.com",
            password: "wrongpassword123"
        });

        if (error) {
            console.log(`❌ Request returned error: "${error.message}"`);

            if (error.message === "Invalid API key") {
                console.error("   🚨 CONCLUSION: The API Key is INVALID/REJECTED by Supabase.");
            } else if (error.message === "Invalid login credentials") {
                console.log("   ✅ CONCLUSION: The API Key is VALID (Server responded with invalid credentials as expected).");
            } else {
                console.log(`   ℹ️ Received error "${error.message}", which implies the API key is probably fine but something else is wrong.`);
            }
        } else {
            console.log("✅ Unexpectedly succeeded login with dummy credentials? (Check if this user exists)");
        }
    } catch (e) {
        console.error("❌ Error initializing/using client:", e);
    }
}
