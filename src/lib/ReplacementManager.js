import dayjs from "dayjs";

export default class ReplacementManager {
    createReplacementMapping({issueConfiguration, body, callActionDate, callInfoFromStorage, tellows}) {
        const replacements = [];

        if (issueConfiguration) {
            replacements.push(
                ["{{$timeField}}", issueConfiguration.timeField],
                ["{{$spamRatingField}}", issueConfiguration.spamRatingField],
                ["{{$cityField}}", issueConfiguration.cityField],
                ["{{$timeField}}", issueConfiguration.timeField]
            );
        }

        if (body) {
            const sipgateUserID = body.userId || body["userId%5B%5D"] || "";
            const sipgateUserName = body.user || body["user%5B%5D"] || "";

            replacements.push(
                ["{{$number}}", `\\u002b${body.from}`],
                ["{{$sipgateUserID}}", sipgateUserID],
                ["{{$sipgateUsername}}", sipgateUserName.replace("+", " ")]
            );

            if (issueConfiguration) {
                replacements.push(["{{$sipgateNumber}}", body.to.replace(issueConfiguration.sipgateNumber, "")]);
            }
        }

        if (callActionDate) {
            if (callInfoFromStorage) {
                const callDuration = callActionDate.diff(dayjs(callInfoFromStorage.date), "s");

                replacements.push(
                    ["{{$minutes}}", `${Math.floor(callDuration / 60)}`.padStart(2, "0")],
                    ["{{$seconds}}", `${callDuration % 60}`.padStart(2, "0")]
                );
            }
            if (issueConfiguration) {
                replacements.push(
                    ["{{$date}}", callActionDate.format(issueConfiguration.dateFormat)],
                    ["{{$time}}", callActionDate.format(issueConfiguration.hourFormat)]
                );
            }
        }

        if (tellows) {
            replacements.push(
                ["{{$rating}}", tellows?.tellows?.score || ""],
                ["{{$city}}", tellows?.tellows?.location || ""]
            );
        }

        return replacements;
    }

    static replaceVariables(textValue, replacements) {
        let result = textValue;

        for (const [variable, replacement] of replacements) {
            result = result.replace(new RegExp(variable, 'g'), replacement);
        }
        return result;
    }
}
