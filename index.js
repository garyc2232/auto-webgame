"use struct";
const puppeteer = require('puppeteer');
const {
    url,
    login,
    pw
} = require("./config.json");

const browserSize = {
    width: 1920 / 2,
    height: 1000
};
const args = [];
args.push(`--window-size=${browserSize.width},${browserSize.height}`);


const CHALLENGE = "form[action='./siai.cgi'] > input[type=submit]";
const BATTLE = "div.count-champ.count > input[type=submit]";
const REFRESH = "form[action='./ffadventure.cgi'] > input[type=submit]";
const SUPER = "form[action='./monster2.cgi']";
const BANK = "form[action='./bank.cgi'] > input[type=submit]";
const HEAL = "form[action='./yado.cgi'] > input[type=submit]";

const savingMoney = async (page) => {
    await page.waitForSelector(BANK, {
        visible: true,
    });
    await page.click(BANK);
    await page.waitForSelector("font > b", {
        visible: true,
    });
    const currentGold = await page.evaluate(async () => {
        const b = document.querySelectorAll("font > b")[0];
        return Math.floor(b.innerHTML / 100) - 3
    })
    if (currentGold > 1) {
        const saving = "input[name=azukeru]";
        await page.waitForSelector(saving);
        await page.focus(saving);
        await page.keyboard.type("" + currentGold);
        console.log(`Saved ${currentGold}`);
        const btnSaving = "input[value=存款]";
        await page.waitForSelector(btnSaving);
        await page.click(btnSaving);
    }
    console.log('saving done');
    await refresh(page);
}
const fightSuper = async (page) => {
    console.log('super chk');
    if (await page.$(SUPER) !== null) {
        await savingMoney(page);
        console.log('super start');
        await page.waitForSelector(`${SUPER} > div > input[type=submit]`, {
            visible: true,
        });
        await page.click(`${SUPER} > div > input[type=submit]`);
        await backToMain(page);
        await sleep(500);
        await page.click(HEAL);
        await refresh(page);
        console.log('super end');
        return false;
    } else {
        console.log('super pass');
        return true
    }
}
const backToMain = async (page) => {
    const btnBack = "input[type=submit]";
    await page.waitForSelector(btnBack, {
        visible: true,
    });
    await page.click(btnBack)
};
const refresh = async (page) => {
    await page.waitForSelector(REFRESH, {
        visible: true,
    });
    console.log('refresh');
    await page.click(REFRESH);
}
const baseFight = async (page) => {
    console.log('battle chk');
    if (await page.$(BATTLE) !== null) {
        console.log('battle start');
        await page.waitForSelector(BATTLE, {
            visible: true,
        });
        await page.click(BATTLE);
        await backToMain(page);
        console.log('battle end');
        return false;
    } else {
        console.log('battle pass');
        return true
    }
}
const challage = async (page) => {
    console.log('challage chk');
    if (await page.$(CHALLENGE) !== null) {
        console.log('challage start');
        await page.waitForSelector(CHALLENGE);
        await sleep(250);
        await page.click(CHALLENGE);
        await sleep(1000);
        await page.select('select[name=sentou]', 'c3511140');
        await backToMain(page);
        await sleep(500);
        await backToMain(page);
        console.log('challage end');
        return false;
    } else {
        console.log('challage pass');
        return true;
    }
}
const sleep = (ms) => new Promise((resolve, rejuct) => setTimeout(() => resolve(), ms));

let loopCount = 0;
const main = async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args
    });
    const page = await browser.newPage();
    await page.setViewport(browserSize);
    await page.goto(url);

    // login 
    const loginName = "input[name=id]";
    await page.focus(loginName);
    await page.keyboard.type(login);
    const password = "input[name=pass]";
    await page.focus(password);
    await page.keyboard.type(pw);
    const submitLogin = "input[type=submit]";
    await page.click(submitLogin);
    await sleep(1000);

    while (true) {
        console.log('START');
        await refresh(page);
        await sleep(1000);
        await fightSuper(page) && await challage(page) && await baseFight(page);
        await sleep(10000);
        loopCount++;
        console.log('END', loopCount);
    }
};

main().then(() => {
    console.log(loopCount);
});