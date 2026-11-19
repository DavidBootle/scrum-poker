
/**
 * Changes the current theme to the new theme
 * by replacing the current stylesheet with
 * a new stylesheet.
 * 
 * @param {string} newTheme The name of the theme.
 * Must match the name of the stylesheet.
 */
export function setTheme(newTheme) {
    localStorage.setItem('theme', newTheme);

    // update theme link
    let linkElement = document.getElementById('themeLink');
    let newLinkElement = document.createElement('link');
    newLinkElement.id = 'themeLink';
    newLinkElement.rel = 'stylesheet';
    newLinkElement.href = `${import.meta.env.BASE_URL}themes/${newTheme}.css`;

    // if stylesheet doesn't exist, append it
    // otherwise replace it
    if (!linkElement) {
        document.head.appendChild(newLinkElement);
    } else {
        linkElement.replaceWith(newLinkElement);
    }

    // update favicon
    let iconLink = document.querySelector("link[rel~='icon']")

    let newIconLink = document.createElement('link');
    newIconLink.rel = 'icon';
    newIconLink.href = `/site-icons/${newTheme}-icon.svg`
    
    // if icon doesn't exist, append it
    // otherwise replace it
    if (!iconLink) {
        document.head.appendChild(newIconLink);
    }
    else {
        iconLink.replaceWith(newIconLink);
    }
}