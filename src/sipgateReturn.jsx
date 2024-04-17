import {SipgateAnswer} from "./answer";
import {SipgateHangup} from "./hangup";
import getBodyData from "./lib/getBodyData";
import {handleIncommingCall} from "./call";

export async function onSipgateReturn(req) {
    const body = getBodyData(req.body)
    const queryParameters = req.queryParameters

    if (queryParameters.webhookEvent[0] === "onIncommingCall"){
        return handleIncommingCall(req);
    }

    if (queryParameters.webhookEvent[0] === "onAnswer"){
        return SipgateAnswer(req)
    }
    if (queryParameters.webhookEvent[0] === "onHangup"){
        return SipgateHangup(req)
    }
}
