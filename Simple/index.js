document.addEventListener("DOMContentLoaded", function(){
    const footerDate = document.getElementById("date");
    const dateItem = new Date().getFullYear();
    footerDate.innerHTML = dateItem;
})