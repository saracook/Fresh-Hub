init();

async function init() {
  const client = await app.initialized();

  const titleInput = document.querySelector('fw-input[name="title"]');
  const descriptionInput = document.querySelector('fw-textarea[name="description"]');

  try {
    const data = await client.data.get('ticket');
    titleInput.value = data.ticket.subject || '';
    descriptionInput.value = data.ticket.description_text || '';
  } catch (err) {
    console.error('Could not fetch ticket data:', err);
  }

  document.getElementById('create-issue').addEventListener('click', async () => {
    const title = titleInput.value;
    const description = descriptionInput.value;
    try {
      await client.request.invoke('createIssue', { title, description });
      client.interface.trigger('showNotify', {
        type: 'success',
        message: 'Issue created successfully!'
      });
      client.instance.close();
    } catch (err) {
      client.interface.trigger('showNotify', {
        type: 'error',
        message: `Error creating issue: ${err.message}`
      });
    }
  });

  fetchIssues(client);
}

async function fetchIssues(client) {
  try {
    const data = await client.request.invoke('fetchIssues', {});
    const issues = JSON.parse(data.response);
    renderIssues(issues);
  } catch (err) {
    client.interface.trigger('showNotify', {
      type: 'error',
      message: `Error fetching issues: ${err.message}`
    });
  }
}

function renderIssues(issues) {
  const container = document.getElementById('issues-container');
  container.innerHTML = '';

  const table = document.createElement('fw-data-table');
  table.setAttribute('id', 'datatable-issues');
  table.setAttribute('label', 'GitHub Issues');

  table.columns = [
    { key: 'number', text: 'Issue ID' },
    { key: 'title', text: 'Title' },
    { key: 'body', text: 'Body' }
  ];

  table.rows = issues.map(issue => ({
    number: issue.number,
    title: issue.title,
    body: issue.body
  }));

  container.appendChild(table);
}
