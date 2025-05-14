/* 
  script.js
  Advanced blog frontend logic:
  - Posts CRUD in localStorage
  - Rich text editing with toolbar
  - Pagination, filtering, sorting, searching
  - Dark mode toggle
  - Modal management with accessibility
  - Scroll to top button
  - Smooth animations and UI feedback
*/

// DOM Elements
const darkModeToggle = document.getElementById('darkModeToggle');
const addPostBtn = document.getElementById('addPostBtn');
const postsList = document.getElementById('postsList');
const postDetail = document.getElementById('postDetail');
const detailTitle = document.getElementById('detailTitle');
const detailDate = document.getElementById('detailDate');
const detailContent = document.getElementById('detailContent');
const detailCategories = document.getElementById('detailCategories');
const backBtn = document.getElementById('backBtn');
const postsSection = document.getElementById('postsSection');

const modal = document.getElementById('modal');
const postForm = document.getElementById('postForm');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const postTitleInput = document.getElementById('postTitle');
const postDateInput = document.getElementById('postDate');
const postCategoriesInput = document.getElementById('postCategories');
const postContentTextarea = document.getElementById('postContent');
const richTextEditor = document.getElementById('richTextEditor');
const richTextToolbar = document.querySelector('.rich-text-toolbar');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const sortOrderSelect = document.getElementById('sortOrder');
const noPostsMsg = document.getElementById('noPostsMsg');
const paginationInfo = document.getElementById('paginationInfo');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const scrollTopBtn = document.getElementById('scrollTopBtn');

let posts = [];
let filteredPosts = [];
let currentPostId = null;
let currentPage = 1;
const POSTS_PER_PAGE = 5;

// Initialize app state and UI
function init() {
  loadPosts();
  loadDarkMode();
  buildCategoryFilterOptions();
  applyFilters();
  bindEvents();
  updatePaginationControls();
  renderPostsPage(currentPage);
}

// Load posts from localStorage or add default posts
function loadPosts() {
  const savedPosts = localStorage.getItem('vividPosts');
  if(savedPosts) {
    posts = JSON.parse(savedPosts);
  } else {
    posts = [
      {
        id: 1,
        title: 'Welcome to Vivid Blog',
        date: '2024-06-21',
        content: '<p>This blog uses <strong>rich text editing</strong> and has advanced features for a vivid experience!</p>',
        categories: ['Welcome', 'Intro']
      },
      {
        id: 2,
        title: 'Exploring JavaScript',
        date: '2024-06-22',
        content: '<p>JavaScript is awesome. Here\'s a quick overview of why it\'s so popular for modern web apps.</p><ul><li>Dynamic language</li><li>Runs in browsers</li><li>Huge ecosystem</li></ul>',
        categories: ['JavaScript', 'Programming']
      },
      {
        id: 3,
        title: 'Styling with CSS',
        date: '2024-06-23',
        content: '<p>CSS makes web pages come alive with colors, layouts, and animations. Master it well!</p>',
        categories: ['CSS', 'Web Design']
      }
    ];
    savePosts();
  }
}

// Save posts to localStorage
function savePosts() {
  localStorage.setItem('vividPosts', JSON.stringify(posts));
}

// Build categories filter options dynamically from posts
function buildCategoryFilterOptions() {
  // Gather distinct categories
  const categories = new Set();
  posts.forEach(p => {
    if(p.categories && p.categories.length) {
      p.categories.forEach(cat => categories.add(cat.trim()));
    }
  });

  // Clear existing options except "All"
  while(categoryFilter.options.length > 1) {
    categoryFilter.remove(1);
  }

  [...categories].sort((a,b)=>a.localeCompare(b)).forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });
}

// Event bindings
function bindEvents() {
  darkModeToggle.addEventListener('click', toggleDarkMode);
  addPostBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', onCancelForm);
  postForm.addEventListener('submit', onSavePost);
  backBtn.addEventListener('click', goBackToList);
  searchInput.addEventListener('input', debounce(onFilterInputsChange, 250));
  categoryFilter.addEventListener('change', onFilterInputsChange);
  sortOrderSelect.addEventListener('change', onFilterInputsChange);
  prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
  nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));
  scrollTopBtn.addEventListener('click', scrollToTop);

  // Keyboard shortcuts for rich text editor toolbar buttons
  richTextToolbar.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      const command = button.dataset.command;
      document.execCommand(command, false, null);
      richTextEditor.focus();
    });
  });

  // Sync richText editor content to hidden textarea on input
  richTextEditor.addEventListener('input', () => {
    postContentTextarea.value = richTextEditor.innerHTML;
  });

  // Accessibility: trap focus inside modal when open
  modal.addEventListener('keydown', trapFocus);
  window.addEventListener('scroll', onScroll);

  // Open post detail when clicking post preview
  postsList.addEventListener('keydown', e => {
    if((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('post-preview')){
      e.preventDefault();
      const id = Number(e.target.dataset.id);
      openPostDetail(id);
    }
  });
  postsList.addEventListener('click', e => {
    const postEl = e.target.closest('.post-preview');
    if(postEl){
      const id = Number(postEl.dataset.id);
      openPostDetail(id);
    }
  });
}

// Toggle dark mode on/off and save preference
function toggleDarkMode() {
  const enabled = document.body.classList.toggle('dark-mode');
  darkModeToggle.textContent = enabled ? '☀️ Light Mode' : '🌙 Dark Mode';
  localStorage.setItem('vividDarkMode', enabled ? 'enabled' : 'disabled');
}

// Load saved dark mode preference
function loadDarkMode() {
  const enabled = localStorage.getItem('vividDarkMode') === 'enabled';
  if(enabled) {
    document.body.classList.add('dark-mode');
    darkModeToggle.textContent = '☀️ Light Mode';
  } else {
    darkModeToggle.textContent = '🌙 Dark Mode';
  }
}

// Apply filters, sorting, and search to posts list
function applyFilters() {
  const searchVal = searchInput.value.trim().toLowerCase();
  const selectedCat = categoryFilter.value;
  const sortOrder = sortOrderSelect.value;

  filteredPosts = posts.filter(post => {
    // Filter by category
    if(selectedCat !== "all" && !(post.categories || []).some(cat => cat.toLowerCase() === selectedCat.toLowerCase())){
      return false;
    }
    // Search title and content text only (strip HTML tags from content)
    const strippedContent = post.content.replace(/<[^>]*>/g, '').toLowerCase();
    return post.title.toLowerCase().includes(searchVal) || strippedContent.includes(searchVal);
  });

  // Sort by date
  filteredPosts.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  currentPage = 1;
  updatePaginationControls();
}

// Debounce helper
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this,args), delay);
  };
}

// Handle search/filter/sort changes
function onFilterInputsChange() {
  applyFilters();
  renderPostsPage(currentPage);
}

// Render posts list for page
function renderPostsPage(page) {
  postsList.setAttribute('aria-busy', 'true');
  clearPostsList();

  const start = (page - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE;
  const pagePosts = filteredPosts.slice(start, end);

  if(pagePosts.length === 0) {
    noPostsMsg.hidden = false;
    postsList.hidden = true;
  } else {
    noPostsMsg.hidden = true;
    postsList.hidden = false;
    pagePosts.forEach(post => {
      const li = document.createElement('li');
      li.className = 'post-preview';
      li.tabIndex = 0;
      li.setAttribute('role','listitem');
      li.dataset.id = post.id;
      li.setAttribute('aria-label', `Post: ${post.title}. Published on ${formatDate(post.date)}.`);

      li.innerHTML = `
        <h3 class="post-title">${escapeHtml(post.title)}</h3>
        <p class="post-meta">${formatDate(post.date)}</p>
        <p class="post-excerpt">${getExcerpt(post.content, 140)}</p>
      `;
      postsList.appendChild(li);
    });
  }

  updatePaginationControls();
  postsList.setAttribute('aria-busy', 'false');
}

// Clear posts list content
function clearPostsList() {
  while(postsList.firstChild){
    postsList.removeChild(postsList.firstChild);
  }
}

// Pagination controls update
function updatePaginationControls() {
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE) || 1;
  paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;

  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

// Change page if valid
function changePage(newPage) {
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE) || 1;
  if(newPage < 1 || newPage > totalPages) return;
  currentPage = newPage;
  renderPostsPage(currentPage);
  window.scrollTo({top: postsSection.offsetTop - 80, behavior:'smooth'});
}

// Open modal for new post creation
function openModal() {
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  postForm.reset();
  richTextEditor.innerHTML = '';
  postContentTextarea.value = '';
  postCategoriesInput.value = '';
  setModalTitle('Add New Post');
  postTitleInput.focus();
}

// Close modal 
function closeModal() {
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  addPostBtn.focus();
}

// Cancel form modal
function onCancelForm() {
  closeModal();
}

// Set modal title dynamically
function setModalTitle(text) {
  document.getElementById('modalTitle').textContent = text;
}

// Validate form inputs
function validateForm() {
  if(postTitleInput.value.trim().length < 3) {
    alert('Title should be at least 3 characters.');
    postTitleInput.focus();
    return false;
  }
  if(!postDateInput.value) {
    alert('Please select a date.');
    postDateInput.focus();
    return false;
  }
  if(richTextEditor.textContent.trim().length < 10) {
    alert('Content should be at least 10 characters.');
    richTextEditor.focus();
    return false;
  }
  return true;
}

// Save post (new or updated)
function onSavePost(event) {
  event.preventDefault();
  if(!validateForm()) return;
  const title = postTitleInput.value.trim();
  const date = postDateInput.value;
  const content = richTextEditor.innerHTML.trim();
  const categoriesRaw = postCategoriesInput.value.trim();
  const categories = categoriesRaw ? categoriesRaw.split(',').map(c => c.trim()).filter(Boolean) : [];

  // Create new id
  const newId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1;

  // Create new post object
  const newPost = {id: newId, title, date, content, categories};

  posts.unshift(newPost);
  buildCategoryFilterOptions();
  savePosts();
  applyFilters();
  closeModal();
  renderPostsPage(currentPage);
  openPostDetail(newId);
}

// Open post detail view
function openPostDetail(postId) {
  currentPostId = postId;
  const post = posts.find(p => p.id === postId);
  if(!post) return;

  // Fill detail view
  detailTitle.textContent = post.title;
  detailDate.textContent = formatDate(post.date);
  detailContent.innerHTML = post.content;
  detailCategories.innerHTML = '';

  if(post.categories.length) {
    post.categories.forEach(cat => {
      const span = document.createElement('span');
      span.textContent = cat;
      detailCategories.appendChild(span);
    });
  }

  postsSection.hidden = true;
  postDetail.hidden = false;
  postDetail.focus();
  window.scrollTo({top: 0, behavior: 'smooth'});
}

// Go back to posts list from detail view
function goBackToList() {
  currentPostId = null;
  postDetail.hidden = true;
  postsSection.hidden = false;
  postsList.focus();
  window.scrollTo({top: postsSection.offsetTop - 80, behavior: 'smooth'});
}

// Format date (YYYY-MM-DD) to readable string
function formatDate(dateString) {
  const d = new Date(dateString + 'T00:00:00'); // normalize date part only
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Escape HTML entities for safe text output
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (m) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[m];
  });
}

// Extract excerpt (text content stripped from HTML) limited to len characters
function getExcerpt(html, length = 140) {
  const div = document.createElement('div');
  div.innerHTML = html;
  let txt = div.textContent.trim();
  if(txt.length <= length) return txt;
  return txt.slice(0, length) + '…';
}

// Trap focus inside modal for accessibility
function trapFocus(e) {
  if (e.key !== 'Tab') return;
  const focusable = modal.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

// Scroll handler for scrollToTop button visibility
function onScroll() {
  if(window.scrollY > 300) {
    scrollTopBtn.classList.add('visible');
    scrollTopBtn.hidden = false;
  } else {
    scrollTopBtn.classList.remove('visible');
    scrollTopBtn.hidden = true;
  }
}

// Scroll smoothly to top
function scrollToTop() {
  window.scrollTo({top: 0, behavior: 'smooth'});
}

// Initialize the app
init();
