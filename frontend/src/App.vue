<script>

let linkElement = document.getElementById('themeLink');
var theme = localStorage.getItem('theme') || 'default';

if (!linkElement) {
  linkElement = document.createElement('link');
  linkElement.id = 'themeLink';
  linkElement.rel = 'stylesheet';
  
  // 3. Inject it into the <head> section of the page
  document.head.appendChild(linkElement);

  linkElement.href = `src/css/themes/${theme}.css`;
}
</script>

<template>
    <router-view></router-view>
</template>

<style>
html, body, #app {
    height: 100%;
    margin: 0;
}
</style>