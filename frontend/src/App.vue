<script>

// update theme and icon
import { setTheme } from './utilities';
var theme = localStorage.getItem('theme') || 'default';
setTheme(theme);

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