import { adminLogin } from "../controllers/authController.js";

const req = {
    body: {
        email: "test@example.com",
        password: "wrongpassword",
    },
};

const res = {
    status: (code) => {
        return {
            json: (data) => {
                console.log(`Response Status: ${code}`);
                console.log("Response Body:", JSON.stringify(data, null, 2));
                return data; // just in case
            },
        };
    },
    json: (data) => {
        console.log("Response Status: 200");
        console.log("Response Body:", JSON.stringify(data, null, 2));
    },
};

console.log("--- Running adminLogin Reproduction ---");
adminLogin(req, res).catch((err) => {
    console.error("Unhandled error in reproduction:", err);
});
