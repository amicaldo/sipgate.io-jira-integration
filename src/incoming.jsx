import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import getBodyData from "./lib/getBodyData"
import api from '@forge/api'

dayjs.extend(utc)
dayjs.extend(timezone)

export async function SipgateCallIncomming(req) {
    console.log("CALLED", "handleIncommingCall")
    console.log("URL", req.headers.host[0], req.path);
    const queryParameters = req.queryParameters
    const body = getBodyData(req.body)
    const newOldUrl = `https://${req.headers.host[0]}${req.path}`
    console.log('New URL', newOldUrl)

    console.log("NEUER eingehender call; handleIncommingCall", body);
    console.log("Send request to", newOldUrl + `?project=${queryParameters.project[0]}&phoneField=${queryParameters.phoneField[0]}&issueID=${queryParameters.issueID[0]}&closeID=${queryParameters.closeID[0]}&webhookEvent=onHookCall`);

    // TODO remove await
    await api.fetch(`${newOldUrl}?project=${queryParameters.project[0]}&phoneField=${queryParameters.phoneField[0]}&issueID=${queryParameters.issueID[0]}&closeID=${queryParameters.closeID[0]}&webhookEvent=onHookCall`, {
        method: 'POST',
        headers: { "Content-Type": ["application/json"] },
        body: JSON.stringify(body)
    }).then(console.log)
    .catch(console.error)

    const answerURL = `${newOldUrl}?webhookEvent=onAnswer`
    const hangupURL = `${newOldUrl}?webhookEvent=onHangup&closeID=${queryParameters.closeID[0]}`

    console.log("fetch send let return a response", {
        body: `<?xml version="1.0" encoding="UTF-8"?><Response onAnswer="${answerURL}" onHangup="${hangupURL}" />`,
    });

    return {
        headers: { "Content-Type": ["application/xml"] },
        body: `<?xml version="1.0" encoding="UTF-8"?><Response onAnswer="${answerURL}" onHangup="${hangupURL}" />`,
        statusCode: 200,
        statusText: "OK"
    }
}
