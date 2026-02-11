window.onload = function () {

  const connection = new Postmonger.Session();
  let payload = {};

  connection.trigger("ready");

  connection.on("initActivity", data => {

    payload = data || {};

    // Load saved country field if exists
    if (
      payload.arguments &&
      payload.arguments.execute &&
      payload.arguments.execute.inArguments
    ) {
      const savedCountry =
        payload.arguments.execute.inArguments[0]?.country;

      if (savedCountry) {
        document.getElementById("countryField").value = savedCountry;
      }
    }

    // Enable/disable next button based on input
    document
      .getElementById("countryField")
      .addEventListener("input", function () {

        const isValid = this.value.trim().length > 0;

        connection.trigger("updateButton", {
          button: "next",
          enabled: isValid
        });

      });

  });

  connection.on("clickedNext", function () {

    const countryField =
      document.getElementById("countryField").value.trim();

    if (!countryField) {
      alert("Please enter a country field");
      return;
    }

    payload.arguments = payload.arguments || {};
    payload.arguments.execute = payload.arguments.execute || {};

    // Set the country field from user input
    payload.arguments.execute.inArguments = [
      {
        country: countryField
      }
    ];

    payload.metaData = payload.metaData || {};
    payload.metaData.isConfigured = true;
    payload.name = "Daytime Window Check";

    console.log(
      "Saving payload:",
      JSON.stringify(payload, null, 2)
    );

    connection.trigger("updateActivity", payload);

  });

};
