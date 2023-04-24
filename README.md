# Sipgate & Jira Integration

This integration allows incoming calls on Sipgate to be automatically turned into Jira tickets. To configure the integration, follow these steps:

## Configure Issue Creation

1. Go to "Apps" -> "Manage apps" -> "Sipgate & Jira" and set up the issue configuration for creating tickets with the desired title and description.

    * `issueSummary`: The title of the Jira ticket. This field can include placeholders for call information, such as `{{$numberOrName}}` for the caller's number or name, `{{$spamRatingField}}` for the spam rating, `{{$cityField}}` for the caller's city, `{{$date}}` and `{{$time}}` for the date and time of the call.

    * `issueDescription`: The description of the Jira ticket. This field can also include placeholders for call information.

    * `issueType`: The type of issue to be created. This field determines the workflow that the ticket will follow in Jira.

    * `issuePriority`: The priority of the ticket, ranging from low to high.

    * `issueAssignee`: The Jira user to whom the ticket will be assigned. This can be set to a specific user or left blank to assign the ticket to the project lead.

## Generate the Webhook URL

2. In the Sipgate account settings, generate the webhook URL to ensure that tickets are created in the correct Jira project. The following fields are required for configuring the webhook:

    * `projectID`: The ID of the Jira project in which the ticket will be created.

    * `cField1`: The field in which the incoming call's telephone number will be stored.

    * `issueID`: The ID of the issue type to be created for the incoming call.

## Map Jira Accounts

3. Map all employees and accounts in Jira to their corresponding accounts in Sipgate.

This application is created and maintained by amicaldo GmbH. If you need further assistance, please contact support at support@amicaldo.de.
