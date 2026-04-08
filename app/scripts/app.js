// Team name (lowercase) → 'owner/repo' default mapping
const TEAM_REPO_MAP = {
  'carina': 'stanford-rc/carina',
  'sherlock': 'stanford-rc/sherlock'
};

init();

async function init() {
  const client = await app.initialized();
  client.events.on('app.activated', () => setupApp(client));
}

async function setupApp(client) {
  const repoSelect = document.getElementById('repo-select');
  const viewIssuesBtn = document.getElementById('view-issues');
  const newIssueBtn = document.getElementById('new-issue');
  const issuesContainer = document.getElementById('issues-container');
  const issueForm = document.getElementById('issue-form');
  const titleInput = document.querySelector('#issue-form fw-input[name="title"]');
  const descriptionInput = document.querySelector('#issue-form fw-textarea[name="description"]');

  // Fetch repos, ticket data, requester, and group in parallel
  const [repos, groupName] = await Promise.all([
    fetchRepos(client),
    getGroupName(client)
  ]);

  // Populate repo dropdown
  repoSelect.innerHTML = repos.map(r =>
    `<option value="${r.full_name}">${r.full_name}</option>`
  ).join('');

  // Pre-select based on group→repo mapping
  const mappedRepo = groupName
    ? Object.entries(TEAM_REPO_MAP).find(([team]) =>
        groupName.toLowerCase().includes(team)
      )?.[1]
    : null;

  if (mappedRepo && repos.some(r => r.full_name === mappedRepo)) {
    repoSelect.value = mappedRepo;
  }

  // Pre-populate form with current ticket data
  try {
    const [ticketData, requesterData, iparams] = await Promise.all([
      client.data.get('ticket'),
      client.data.get('requester'),
      client.iparams.get('freshdesk_domain')
    ]);
    const ticket = ticketData.ticket;
    const requester = requesterData.requester;
    const ticketUrl = `https://${iparams.freshdesk_domain}/a/tickets/${ticket.id}`;
    const createdAt = new Date(ticket.created_at).toLocaleString();
    titleInput.value = ticket.subject || '';
    descriptionInput.value = [
      ticket.description_text || '',
      '',
      '---',
      `**Freshdesk ticket:** ${ticketUrl}`,
      `**Requester:** ${requester.name} (${requester.email})`,
      `**Job Title:** ${requester.job_title || 'N/A'}`,
      `**Created:** ${createdAt}`,
      `**Priority:** ${ticket.priority_label}`,
      `**Type:** ${ticket.type}`,
      `**Status:** ${ticket.status_label}`,
    ].join('\n');
  } catch (err) {
    console.error('Could not fetch ticket data:', err);
  }

  viewIssuesBtn.style.display = 'inline-block';
  newIssueBtn.style.display = 'inline-block';
  issuesContainer.style.display = 'none';
  issueForm.style.display = 'none';

  repoSelect.addEventListener('change', () => {
    if (issuesContainer.style.display !== 'none') {
      fetchIssues(client);
    } else {
      viewIssuesBtn.style.display = 'inline-block';
      newIssueBtn.style.display = 'inline-block';
      issueForm.style.display = 'none';
    }
  });

  viewIssuesBtn.addEventListener('click', () => {
    viewIssuesBtn.style.display = 'none';
    newIssueBtn.style.display = 'inline-block';
    issuesContainer.style.display = 'block';
    issueForm.style.display = 'none';
    fetchIssues(client);
  });

  newIssueBtn.addEventListener('click', () => {
    viewIssuesBtn.style.display = 'inline-block';
    newIssueBtn.style.display = 'none';
    issuesContainer.style.display = 'none';
    issueForm.style.display = 'block';
  });

  document.getElementById('create-issue').addEventListener('click', async () => {
    const title = titleInput.value;
    const description = descriptionInput.value;
    const [owner, repo] = repoSelect.value.split('/');
    const success = await createIssue(client, title, description, owner, repo);
    if (success) {
      titleInput.value = '';
      descriptionInput.value = '';
      viewIssuesBtn.style.display = 'none';
      newIssueBtn.style.display = 'inline-block';
      issuesContainer.style.display = 'block';
      issueForm.style.display = 'none';
      fetchIssues(client);
    }
  });

  fetchIssues(client);
}

async function getGroupName(client) {
  try {
    const data = await client.data.get('group');
    return data.group.name;
  } catch (err) {
    console.error('Could not fetch group data:', err);
    return null;
  }
}

async function fetchRepos(client) {
  try {
    const data = await client.request.invoke('fetchRepos', {});
    return JSON.parse(data.response);
  } catch (err) {
    console.error('Error fetching repos:', err);
    return [];
  }
}

async function fetchIssues(client) {
  const repoSelect = document.getElementById('repo-select');
  const [owner, repo] = repoSelect.value.split('/');
  try {
    const data = await client.request.invoke('fetchIssues', { owner, repo });
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

async function createIssue(client, title, description, owner, repo) {
  try {
    await client.request.invoke('createIssue', { title, description, owner, repo });
    client.interface.trigger('showNotify', {
      type: 'success',
      message: 'Issue created successfully!'
    });
    return true;
  } catch (err) {
    client.interface.trigger('showNotify', {
      type: 'error',
      message: `Error creating issue: ${err.message}`
    });
    return false;
  }
}
