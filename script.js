document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const filterBtns = document.querySelectorAll('.filter-btn');
    const courseCards = document.querySelectorAll('.course-card');
    const taskItems = document.querySelectorAll('.task-item');
    const checkboxes = document.querySelectorAll('.task-check input');
    const countdownTimer = document.getElementById('countdown-timer');
    const nextEventName = document.getElementById('next-event-name');
    const emptyState = document.querySelector('.empty-state');

    // --- 1. Persistence & Checkbox Logic ---

    // Load saved states
    checkboxes.forEach(checkbox => {
        const taskId = checkbox.closest('.task-item').dataset.id;
        const isChecked = localStorage.getItem(taskId) === 'true';
        checkbox.checked = isChecked;
        toggleTaskCompletion(checkbox.closest('.task-item'), isChecked);

        checkbox.addEventListener('change', (e) => {
            const checked = e.target.checked;
            localStorage.setItem(taskId, checked);
            toggleTaskCompletion(e.target.closest('.task-item'), checked);
            updateNextEvent(); // Re-calc next event in case the next one was just done
        });
    });

    function toggleTaskCompletion(taskItem, isCompleted) {
        if (isCompleted) {
            taskItem.classList.add('completed');
        } else {
            taskItem.classList.remove('completed');
        }
    }

    // --- 2. Filtering Logic ---

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add to clicked
            btn.classList.add('active');

            const filterValue = btn.dataset.filter;
            const statusValue = btn.dataset.status;

            filterTasks(filterValue, statusValue);
        });
    });

    function filterTasks(courseFilter, statusFilter) {
        let visibleCount = 0;

        // Reset Course visibility first
        if (courseFilter) {
            courseCards.forEach(card => {
                if (courseFilter === 'all' || card.dataset.course === courseFilter) {
                    card.classList.remove('hidden');
                    // Ensure all tasks inside are visible (subject to status filter below)
                    card.querySelectorAll('.task-item').forEach(t => t.classList.remove('hidden'));
                } else {
                    card.classList.add('hidden');
                }
            });
        }

        // Apply Status Filter if active (overrides course filter view for individual items)
        if (statusFilter) {
            // Show all cards initially to search within them
            courseCards.forEach(card => card.classList.remove('hidden'));

            taskItems.forEach(task => {
                const isCompleted = task.classList.contains('completed');
                let shouldShow = false;

                if (statusFilter === 'pending' && !isCompleted) shouldShow = true;
                if (statusFilter === 'completed' && isCompleted) shouldShow = true;

                if (shouldShow) {
                    task.classList.remove('hidden');
                    visibleCount++;
                } else {
                    task.classList.add('hidden');
                }
            });

            // Hide cards that have no visible tasks
            courseCards.forEach(card => {
                const visibleTasks = card.querySelectorAll('.task-item:not(.hidden)');
                if (visibleTasks.length === 0) {
                    card.classList.add('hidden');
                }
            });
        } else {
            // If just filtering by course, we need to count tasks in visible cards
            courseCards.forEach(card => {
                if (!card.classList.contains('hidden')) {
                    visibleCount += card.querySelectorAll('.task-item').length;
                }
            });
        }

        // Empty State
        if (visibleCount === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
        }
    }

    // --- 3. Date & Countdown Logic ---

    function updateDateTime() {
        const now = new Date();
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit' };

        document.getElementById('current-date').innerText = now.toLocaleDateString('ar-SA', dateOptions);
        document.getElementById('current-time').innerText = now.toLocaleTimeString('ar-SA', timeOptions);
    }

    function updateNextEvent() {
        const now = new Date();
        let nextTask = null;
        let minDiff = Infinity;

        taskItems.forEach(task => {
            // Skip completed tasks for countdown
            if (task.classList.contains('completed')) return;

            const taskDate = new Date(task.dataset.date);
            const diff = taskDate - now;

            if (diff > 0 && diff < minDiff) {
                minDiff = diff;
                nextTask = task;
            }
        });

        if (nextTask) {
            const taskName = nextTask.querySelector('.task-name').innerText;
            const courseName = nextTask.closest('.course-card').querySelector('h3').innerText;
            nextEventName.innerText = `${courseName}: ${taskName}`;

            // Format Countdown
            const days = Math.floor(minDiff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((minDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((minDiff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((minDiff % (1000 * 60)) / 1000);

            countdownTimer.innerText = `${days}ي ${hours}س ${minutes}د ${seconds}ث`;
            countdownTimer.style.color = 'var(--primary-color)';
        } else {
            nextEventName.innerText = 'لا توجد مهام قادمة';
            countdownTimer.innerText = '00:00:00:00';
            countdownTimer.style.color = 'var(--success-color)';
        }
    }

    setInterval(() => {
        updateDateTime();
        updateNextEvent();
    }, 1000);

    updateDateTime();
    updateNextEvent();
    updateActiveTasksBanner(); // Call once on load

    function updateActiveTasksBanner() {
        const banner = document.getElementById('active-tasks-banner');
        const listContainer = document.getElementById('periodic-tasks-list');
        const now = new Date();
        const activeTasks = [];

        taskItems.forEach(task => {
            if (task.classList.contains('completed')) return;

            const dueDate = new Date(task.dataset.date);
            let startDate = null;

            // Try to find start date from text if not in attributes
            const startSpan = task.querySelector('.start-date');
            if (startSpan) {
                // assume text is like "16/02" or similar
                const text = startSpan.innerText.trim();
                // remove icon if needed, but innerText usually gets text. 
                // Regex to find DD/MM
                const match = text.match(/(\d{1,2})\/(\d{1,2})/);
                if (match) {
                    const day = parseInt(match[1]);
                    const month = parseInt(match[2]) - 1; // months are 0-indexed
                    startDate = new Date(2026, month, day); // Assuming 2026
                }
            }

            // Logic for "Open":
            // 1. If start date exists: Start <= Now <= Due
            // 2. If no start date: Now <= Due (Show if due within 3 days for urgency?? Or just ignore? User said "Open Tasks")
            // Let's assume user means specific "Access From" tasks primarily, OR urgent tasks.
            // "Open Currently" usually implies the window has opened.

            let isOpen = false;
            if (startDate) {
                if (now >= startDate && now <= dueDate) {
                    isOpen = true;
                }
            } else {
                // If no start date, is it "Open"? Technically yes. 
                // But to avoid noise, let's only adding warnings for things due in < 7 days
                const diffTime = dueDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays >= 0 && diffDays <= 5) {
                    isOpen = true; // Warn about these too
                }
            }

            if (isOpen) {
                const taskName = task.querySelector('.task-name').innerText;
                const courseCode = task.closest('.course-card').dataset.course;
                activeTasks.push(`${courseCode}: ${taskName}`);
            }
        });

        if (activeTasks.length > 0) {
            banner.classList.remove('hidden');
            // Create scrolling span
            // Duplicate content for smooth scrolling if needed, or just list them
            const text = activeTasks.join('   ✦   ');
            listContainer.innerHTML = `<div style="display:inline-block; padding-left:100%; animation: marquee 20s linear infinite;">${text}</div>`;

            // Add keyframes dynamically if not in CSS, or rely on CSS class
            // let's use the CSS class I added 'scrolling-text' but I need to clear inner HTML first
            listContainer.innerHTML = `<span>${text}</span>`;
        } else {
            banner.classList.add('hidden');
        }
    }

    setInterval(updateActiveTasksBanner, 60000); // Update every minute
});
