
exports = {
  createIssue: async function(request) {
    const { title, description, owner, repo } = request;
    const issue = { title, body: description };

    try {
      const response = await $request.invokeTemplate("create_issue", {
        context: { owner, repo },
        body: JSON.stringify(issue)
      });
      renderData(null, response);
    } catch (error) {
      console.log(error);
      renderData(error, null);
    }
  },

  fetchIssues: async function(request) {
    const { owner, repo } = request;
    try {
      const response = await $request.invokeTemplate("fetch_issues", {
        context: { owner, repo }
      });
      renderData(null, response.response);
    } catch (error) {
      console.error("Error fetching issues:", error);
      renderData(error, null);
    }
  },

  fetchRepos: async function() {
    try {
      const response = await $request.invokeTemplate("fetch_repos");
      renderData(null, response.response);
    } catch (error) {
      console.error("Error fetching repos:", error);
      renderData(error, null);
    }
  }
};
