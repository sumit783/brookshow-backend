import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import User from '../models/User.js';
import ArtistProfile from '../models/ArtistProfile.js';
import PlannerProfile from '../models/PlannerProfile.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';

// Import controllers directly to test logic without http overhead first
import { requestWithdrawal as artistWithdraw } from '../controllers/artistController.js';
import { requestWithdrawal as plannerWithdraw } from '../controllers/plannerController.js';

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.body = data;
        return res;
    };
    return res;
};

const runTest = async () => {
    console.log("--- Starting Withdrawal Verification ---");

    // Connect DB
    await mongoose.connect(ENV.MONGO_URI);
    console.log("Connected to DB");

    try {
        // 1. Create Test User and Artist with balance
        const user = await User.create({
            email: "test_withdraw_artist_" + Date.now() + "@example.com",
            displayName: "Test Artist"
        });

        const artist = await ArtistProfile.create({
            userId: user._id,
            walletBalance: 1000 // Verified Balance
        });

        console.log(`Created Artist with Balance: ${artist.walletBalance}`);

        // 2. Test Insufficient Funds
        console.log("\nTest 1: Insufficient Funds (Request 5000)");
        const req1 = {
            user: { id: user._id },
            body: { amount: 5000, bankDetails: { accountHolder: "Test" } }
        };
        const res1 = mockRes();
        await artistWithdraw(req1, res1);

        if (res1.statusCode === 400 && res1.body.message === "Insufficient balance") {
            console.log("✅ Correctly rejected insufficient funds.");
        } else {
            console.error("❌ Failed Insufficient Funds Check:", res1.statusCode, res1.body);
        }

        // 3. Test Valid Withdrawal
        console.log("\nTest 2: Valid Withdrawal (Request 500)");
        const req2 = {
            user: { id: user._id },
            body: { amount: 500, bankDetails: { accountHolder: "Test" } }
        };
        const res2 = mockRes();
        await artistWithdraw(req2, res2);

        if (res2.statusCode === 201 && res2.body.success) {
            console.log("✅ Withdrawal Approved.");
            console.log("   New Balance Body:", res2.body.newBalance);

            // Allow DB update time
            const updatedArtist = await ArtistProfile.findById(artist._id);
            console.log("   DB Balance:", updatedArtist.walletBalance);

            if (updatedArtist.walletBalance === 500) {
                console.log("✅ Balance deducted correctly in DB.");
            } else {
                console.error("❌ Balance NOT deducted correctly via DB.");
            }

            const withdrawal = await WithdrawalRequest.findOne({ userId: user._id });
            if (withdrawal) {
                console.log("✅ Withdrawal Request created in DB.");
            } else {
                console.error("❌ Withdrawal Request NOT found in DB.");
            }
        } else {
            console.error("❌ Failed Valid Withdrawal:", res2.statusCode, res2.body);
        }

    } catch (e) {
        console.error("Error in test:", e);
    } finally {
        await mongoose.disconnect();
        console.log("\n--- Test Complete ---");
        process.exit(0);
    }
};

runTest();
