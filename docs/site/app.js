/**
 * Pure Lambda Documentation Site JavaScript
 * Handles navigation, section switching, and interactive features
 */

class DocumentationSite {
    constructor() {
        this.currentSection = 'quickstart';
        this.mobileMenuOpen = false;
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupMobileMenu();
        this.setupSearch();
        this.setupCodeHighlighting();
        this.setupCopyButtons();
        this.loadFromHash();
        this.addA11ySupport();
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link[data-section]');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
                this.updateActiveNav(link);
                this.updateURL(section);
            });
        });

        // Handle external links
        const externalLinks = document.querySelectorAll('.nav-link.external');
        externalLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Allow default behavior for external links
                console.log(`Opening external link: ${link.href}`);
            });
        });
    }

    setupMobileMenu() {
        // Add mobile menu toggle button
        const sidebar = document.querySelector('.sidebar');
        const toggleButton = document.createElement('button');
        toggleButton.className = 'mobile-menu-toggle';
        toggleButton.innerHTML = '☰';
        toggleButton.setAttribute('aria-label', 'Toggle navigation menu');

        // Insert toggle button (would need CSS adjustments for mobile)
        if (window.innerWidth <= 768) {
            document.body.insertBefore(toggleButton, sidebar);
        }

        toggleButton.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.mobileMenuOpen &&
                !sidebar.contains(e.target) &&
                !toggleButton.contains(e.target)) {
                this.closeMobileMenu();
            }
        });
    }

    setupSearch() {
        // Add basic search functionality
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search documentation...';
        searchInput.className = 'search-input';
        searchInput.style.cssText = `
            width: 100%;
            padding: 0.5rem;
            margin: 1rem 1.5rem;
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            font-size: 0.875rem;
        `;

        const logo = document.querySelector('.logo');
        logo.after(searchInput);

        searchInput.addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });
    }

    setupCodeHighlighting() {
        // Basic syntax highlighting for code blocks
        const codeBlocks = document.querySelectorAll('pre code');

        codeBlocks.forEach(block => {
            this.highlightSyntax(block);
        });
    }

    setupCopyButtons() {
        // Add copy buttons to code blocks
        const codeBlocks = document.querySelectorAll('pre');

        codeBlocks.forEach(block => {
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.innerHTML = '📋';
            copyButton.title = 'Copy to clipboard';
            copyButton.style.cssText = `
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                border-radius: 3px;
                padding: 0.25rem 0.5rem;
                cursor: pointer;
                opacity: 0;
                transition: opacity 0.2s;
            `;

            block.style.position = 'relative';
            block.appendChild(copyButton);

            block.addEventListener('mouseenter', () => {
                copyButton.style.opacity = '1';
            });

            block.addEventListener('mouseleave', () => {
                copyButton.style.opacity = '0';
            });

            copyButton.addEventListener('click', () => {
                this.copyToClipboard(block.querySelector('code').textContent);
                copyButton.innerHTML = '✅';
                setTimeout(() => {
                    copyButton.innerHTML = '📋';
                }, 2000);
            });
        });
    }

    showSection(sectionId) {
        // Hide all sections
        const sections = document.querySelectorAll('.doc-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;

            // Scroll to top of content
            targetSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    updateActiveNav(activeLink) {
        // Remove active class from all nav links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Add active class to clicked link
        activeLink.classList.add('active');
    }

    updateURL(section) {
        // Update URL hash without triggering page reload
        history.pushState(null, null, `#${section}`);
    }

    loadFromHash() {
        // Load section from URL hash on page load
        const hash = window.location.hash.slice(1);
        if (hash) {
            const link = document.querySelector(`[data-section="${hash}"]`);
            if (link) {
                this.showSection(hash);
                this.updateActiveNav(link);
            }
        }
    }

    toggleMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        this.mobileMenuOpen = !this.mobileMenuOpen;

        if (this.mobileMenuOpen) {
            sidebar.classList.add('mobile-open');
        } else {
            sidebar.classList.remove('mobile-open');
        }
    }

    closeMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        this.mobileMenuOpen = false;
        sidebar.classList.remove('mobile-open');
    }

    performSearch(query) {
        if (!query.trim()) {
            this.clearSearchHighlights();
            return;
        }

        // Basic search implementation
        const searchResults = [];
        const sections = document.querySelectorAll('.doc-section');

        sections.forEach(section => {
            const content = section.textContent.toLowerCase();
            if (content.includes(query.toLowerCase())) {
                searchResults.push({
                    section: section.id,
                    title: section.querySelector('h2').textContent,
                    matches: this.countMatches(content, query.toLowerCase())
                });
            }
        });

        this.displaySearchResults(searchResults, query);
    }

    countMatches(text, query) {
        const regex = new RegExp(query, 'gi');
        return (text.match(regex) || []).length;
    }

    displaySearchResults(results, query) {
        console.log(`Search results for "${query}":`, results);

        // Highlight search terms in visible content
        this.highlightSearchTerms(query);
    }

    highlightSearchTerms(query) {
        const activeSection = document.querySelector('.doc-section.active');
        if (!activeSection) return;

        // Simple highlighting implementation
        const walker = document.createTreeWalker(
            activeSection,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            if (textNode.textContent.toLowerCase().includes(query.toLowerCase())) {
                const highlightedText = textNode.textContent.replace(
                    new RegExp(query, 'gi'),
                    match => `<mark>${match}</mark>`
                );

                if (highlightedText !== textNode.textContent) {
                    const span = document.createElement('span');
                    span.innerHTML = highlightedText;
                    textNode.parentNode.replaceChild(span, textNode);
                }
            }
        });
    }

    clearSearchHighlights() {
        const highlights = document.querySelectorAll('mark');
        highlights.forEach(mark => {
            mark.replaceWith(mark.textContent);
        });
    }

    highlightSyntax(codeBlock) {
        // Basic syntax highlighting
        let code = codeBlock.textContent;

        // Highlight shell commands
        if (code.includes('#') || code.includes('$')) {
            code = code.replace(/(#.*$)/gm, '<span style="color: #68d391;">$1</span>');
            code = code.replace(/(\$\s*)/gm, '<span style="color: #fbb6ce;">$1</span>');
        }

        // Highlight common keywords
        const keywords = ['function', 'const', 'let', 'var', 'import', 'export', 'from', 'class', 'def', 'fn', 'use'];
        keywords.forEach(keyword => {
            code = code.replace(
                new RegExp(`\\b${keyword}\\b`, 'g'),
                `<span style="color: #9f7aea;">${keyword}</span>`
            );
        });

        // Highlight strings
        code = code.replace(/(["'`])([^"'`]*)\1/g, '<span style="color: #68d391;">$1$2$1</span>');

        // Only update if we made changes
        if (code !== codeBlock.textContent) {
            codeBlock.innerHTML = code;
        }
    }

    copyToClipboard(text) {
        // Modern clipboard API with fallback
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).catch(() => {
                this.fallbackCopyToClipboard(text);
            });
        } else {
            this.fallbackCopyToClipboard(text);
        }
    }

    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.cssText = 'position: fixed; top: -1000px; left: -1000px;';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Copy failed:', err);
        }

        document.body.removeChild(textArea);
    }

    addA11ySupport() {
        // Add keyboard navigation
        document.addEventListener('keydown', (e) => {
            // Arrow key navigation between sections
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.navigateWithKeyboard(e.key === 'ArrowDown');
                }
            }

            // Escape to close mobile menu
            if (e.key === 'Escape' && this.mobileMenuOpen) {
                this.closeMobileMenu();
            }
        });

        // Add skip link for screen readers
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--accent-color);
            color: white;
            padding: 8px;
            text-decoration: none;
            z-index: 1000;
            border-radius: 4px;
        `;

        document.body.insertBefore(skipLink, document.body.firstChild);

        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });

        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
    }

    navigateWithKeyboard(forward) {
        const sections = ['quickstart', 'trust-model', 'conformance', 'pl-seed-01', 'sdk-quickstart', 'seed-workflows'];
        const currentIndex = sections.indexOf(this.currentSection);

        let nextIndex;
        if (forward) {
            nextIndex = (currentIndex + 1) % sections.length;
        } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : sections.length - 1;
        }

        const nextSection = sections[nextIndex];
        const nextLink = document.querySelector(`[data-section="${nextSection}"]`);

        if (nextLink) {
            this.showSection(nextSection);
            this.updateActiveNav(nextLink);
            this.updateURL(nextSection);
        }
    }
}

// Initialize the documentation site when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new DocumentationSite();
});

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    const hash = window.location.hash.slice(1);
    if (hash) {
        const site = new DocumentationSite();
        site.loadFromHash();
    }
});

// Add offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Register service worker for offline functionality
        // (This would require a separate service worker file)
        console.log('Documentation site ready for offline use');
    });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocumentationSite;
}