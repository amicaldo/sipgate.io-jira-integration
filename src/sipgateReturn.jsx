import { SipgateAnswer } from "./answer";
import { SipgateHangup } from "./hangup";
import { SipgateCallIncomming } from "./incoming";
import { SipgateCall } from './actualCall';

export async function onSipgateReturn(req) {
    console.log("I was called!", "onSipgateReturn")
    try {
        const queryParameters = req.queryParameters

        if (queryParameters.webhookEvent[0] === "onIncommingCall") {
            console.log("TRYING TO CALL onIncommingCall")
            return SipgateCallIncomming(req);
        }

        if (queryParameters.webhookEvent[0] === "onHookCall") {
            console.log("TRYING TO CALL onHookCall")
            return SipgateCall(req);
        }

        if (queryParameters.webhookEvent[0] === "onAnswer") {
            console.log("TRYING TO CALL SipgateAnswer", SipgateAnswer)
            return SipgateAnswer(req)
        }
        if (queryParameters.webhookEvent[0] === "onHangup") {
            console.log("TRYING TO CALL SipgateHangup", SipgateHangup)
            return SipgateHangup(req)
        }
        console.log('Could not parse webhookEvent')
        return {
            headers: { "Content-Type": ["application/xml"] },
            body: `<?xml version="1.0" encoding="UTF-8"?><Error>Unhandled Webhook Event</Error>`,
            statusCode: 400,
            statusText: "Bad Request"
        }
    } catch (e) {
        console.error(e);
        return {
            headers: { "Content-Type": ["application/xml"] },
            statusCode: 500,
            statusText: "Internal Server Error"
        }
    }
}
