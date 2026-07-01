const memories = [
    {
        src: 'images/1 (1).JPEG',
        title: '.Feast Concert',
        category: 'Concert',
        year: '2023'
    },
    {
        src: 'images/1 (2).JPEG',
        title: 'Malayan Tapir',
        category: 'Random',
        year: '2024'
    },
    {
        src: 'images/1 (3).JPEG',
        title: 'Sky at Mt.Jerai',
        category: 'Photography',
        year: '2024'
    },
    {
        src: 'images/1 (4).JPEG',
        title: 'Thousands Feet in the Sky',
        category: 'Portrait',
        year: '2024'
    },
    {
        src: 'images/1 (5).JPEG',
        title: 'Malaysia\'s Icon',
        category: 'Architecture',
        year: '2025'
    },
    {
        src: 'images/about.JPEG',
        title: 'The Creator',
        category: 'Portrait',
        year: '2026'
    },
    {
        src: 'images/IMG_9436.JPG',
        title: 'Baskara on the Mic',
        category: 'Concert',
        year: '2023'
    },
    {
        src: 'images/DSC04911.JPG',
        title: 'Post Presentation',
        category: 'Degree Moment',
        year: '2026'
    },
    {
        src: 'images/DSC04903.JPG',
        title: 'Random Moment',
        category: 'Degree Moment',
        year: '2026'
    },
    {
        src: 'images/IMG_9332.JPG',
        title: 'Diki Renada Guitar Solo',
        category: 'Concert',
        year: '2023'
    },
    {
        src: 'images/IMG_9854.JPG',
        title: 'Merdeka 118\'s View',
        category: 'Architecture',
        year: '2024'
    },
    {
        src: 'images/DSC04938.JPG',
        title: 'Amer\'s Smile',
        category: 'Portrait, Degree Moment',
        year: '2026'
    }
];

function initMemoryGrid() {
    const grid = document.getElementById('memory-grid');

    memories.forEach((memory, index) => {
        const card = createMemoryCard(memory, index);
        grid.appendChild(card);
    });
}

function createMemoryCard(memory, index) {
    const card = document.createElement('div');
    card.className = 'memory-card';

    card.innerHTML = `
        <img src="${memory.src}" alt="${memory.title}" class="memory-card-image">
        <div class="memory-card-overlay">
            <div class="memory-card-info">
                <div class="memory-card-meta">
                    <span>${memory.category}</span>
                    <span class="memory-card-separator">•</span>
                    <span>${memory.year}</span>
                </div>
                <h3>${memory.title}</h3>
            </div>
        </div>
    `;

    return card;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initMemoryGrid);
