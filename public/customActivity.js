window.onload = function () {

  const connection = new Postmonger.Session();
  let payload = {};
  let eventDefinitionKey = null;

  // Tell Journey Builder we are ready
  connection.trigger("ready");

  // Initialize activity
  connection.on("initActivity", function (data) {
    payload = data || {};
    connection.trigger("requestInteraction");
  });

  // 🔥 Get Journey Interaction Data
  connection.on("requestedInteraction", function (interaction) {

    try {

      if (interaction.triggers && interaction.triggers.length > 0) {

        eventDefinitionKey = interaction.triggers[0].metaData.eventDefinitionKey;

        console.log("Event Definition Key:", eventDefinitionKey);

        // Show in UI
        document.getElementById("eventDefKey").value = eventDefinitionKey;
      }

    } catch (e) {
      console.error("Error retrieving eventDefinitionKey:", e);
    }

  });

  // When user clicks Done / Next
  connection.on("clickedNext", function () {

    if (!eventDefinitionKey) {
      alert("Unable to detect Event Definition Key.");
      return;
    }

    payload.arguments = payload.arguments || {};
    payload.arguments.execute = payload.arguments.execute || {};

    // 🔥 Dynamically build correct token
    payload.arguments.execute.inArguments = [
      {
        country: `{{Event.${eventDefinitionKey}.Country}}`
      }
    ];

    payload.metaData = payload.metaData || {};
    payload.metaData.isConfigured = true;
    payload.metaData.label = "Daytime Window";

    payload.name = "Daytime Window";

    console.log("Final Payload:", JSON.stringify(payload, null, 2));

    connection.trigger("updateActivity", payload);
  });

};
