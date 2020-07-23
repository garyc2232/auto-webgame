"use struct";
const puppeteer = require('puppeteer');
const {
    url,
    account
} = require("./config.json");
const DEBUG_MODE = false;
const browserSize = {
    width: 1920,
    height: 1000
};
const args = [];
args.push(`--window-size=${browserSize.width},${browserSize.height}`);
args.push('--disable-setuid-sandbox');
args.push('--no-sandbox');


const CHALLENGE = "form[action='./siai.cgi'] > input[type=submit]";
const BATTLE = "div.count-champ.count > input[type=submit]";
const REFRESH = "form[action='./ffadventure.cgi'] > input[type=submit]";
const SUPER = "form[action='./monster2.cgi']";
const FOREST = "form[action='./monster.cgi']";
const BANK = "form[action='./bank.cgi'] > input[type=submit]";
const HEAL = "form[action='./yado.cgi'] > input[type=submit]";
const isVisible = async (el, page) => {
    return await page.evaluate((el) => {
        const e = document.querySelector(el);
        return e.style.display === 'inline-block' || e.style.display === 'inline'
    }, el);
}
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
        return Math.floor(b.innerHTML / 100) - 4
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
    DEBUG_MODE && console.log('saving done');
    await refresh(page, "saving back to main");
    await sleep(1000);
}
const fightSuper = async (page) => {
    DEBUG_MODE && console.log('super chk');
    if (await page.$(SUPER) !== null) {
        await savingMoney(page);
        DEBUG_MODE && console.log('super start');
        await page.waitForSelector(`${SUPER} > div > input[type=submit]`, {
            visible: true,
        });
        await page.click(`${SUPER} > div > input[type=submit]`);
        await backToMain(page);
        DEBUG_MODE && console.log('super end');
        return false;
    } else {
        DEBUG_MODE && console.log('super pass');
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
const refresh = async (page, txt = 'refresh') => {
    await page.waitForSelector(REFRESH, {
        visible: true,
    });
    DEBUG_MODE && console.log(txt);
    await page.click(REFRESH);
}
const baseFight = async (page) => {
    DEBUG_MODE && console.log('battle chk');
    if (await page.$(BATTLE) !== null) {
        DEBUG_MODE && console.log('battle start');
        await page.waitForSelector(BATTLE, {
            visible: true,
        });
        await page.click(BATTLE);
        await backToMain(page);
        DEBUG_MODE && console.log('battle end');
        return false;
    } else {
        DEBUG_MODE && console.log('battle pass');
        return true
    }
}
const challage = async (page) => {
    DEBUG_MODE && console.log('challage chk');
    if (await page.$(CHALLENGE) !== null) {
        DEBUG_MODE && console.log('challage start');
        await page.waitForSelector(CHALLENGE);
        await sleep(250);
        await page.click(CHALLENGE);
        await sleep(1000);
        const optionID = await page.evaluate(() => document.querySelector('select[name=sentou] option:nth-child(2)').value)
        await page.select('select[name=sentou]', optionID);
        await backToMain(page);
        await sleep(500);
        await backToMain(page);
        DEBUG_MODE && console.log('challage end');
        return false;
    } else {
        DEBUG_MODE && console.log('challage pass');
        return true;
    }
}
const sleep = (ms) => new Promise((resolve, rejuct) => setTimeout(() => resolve(), ms));

const login = async (user, page) => {
    console.log('Tyeing to login ', user.name, user.login);
    const loginName = "input[name=id]";
    const password = "input[name=pass]";
    await page.evaluate(({
        loginName,
        password
    }) => {
        document.querySelector(loginName).value = ''
        document.querySelector(password).value = ''
    }, {
        loginName,
        password
    })
    await page.focus(loginName);
    await page.keyboard.type(user.login);
    await page.focus(password);
    await page.keyboard.type(user.pw);
    const submitLogin = "input[type=submit]";
    await page.click(submitLogin);
    await sleep(1000);
}

const forest = async (page) => {
    DEBUG_MODE && console.log('forest chk');

    if (!await isVisible(`div.count-mori.count > span.msg`, page)) {
        await savingMoney(page);
        DEBUG_MODE && console.log('forest start');
        await page.waitForSelector(`div.count-mori.count > input[type=submit]`, {
            visible: true,
        });
        await page.click(`div.count-mori.count > input[type=submit]`);
        while (true) {
            DEBUG_MODE && console.log("forest go");
            await sleep(1000);
            if (await page.$(FOREST) !== null) {
                await page.waitForSelector(`${FOREST} > input[type=submit]`, {
                    visible: true,
                });
                await page.click(`${FOREST} > input[type=submit]`);
            } else {
                DEBUG_MODE && console.log('end');
                await sleep(2000);
                await page.click(`input[type=submit]`);
                break;
            }
        }

        DEBUG_MODE && console.log('forest end');
        return false;
    } else {
        DEBUG_MODE && console.log('forest pass');
        return true;
    }
}

const upgrade = async (user, page) => {
    const upgradePage = "form[action='./kunren.cgi'] > input[type=submit]";
    await login(user, page);

    while (true) {
        try {
            console.log('START', user.name);
            await page.waitForSelector(upgradePage);
            await page.click(upgradePage);
            await page.waitForSelector("select[name=kaisuu]");
            await page.select('select[name=kaisuu]', '10');
            await sleep(500);
            await page.click("form[action='./kunren.cgi'] > p > input[type=submit]");
            await refresh(page, "upgrade back to main");
        } catch (error) {
            await page.goto(url);
            await sleep(1000);
            await login(user, page);
            DEBUG_MODE && console.log(`${user.name}: ${error}`);
        }
    }

}
const task = async (user, page) => {
    let loopCount = 0;

    await login(user, page);

    while (true) {
        try {
            console.log('START', user.name);
            await refresh(page);
            await sleep(1000);
            let allSkiped = await fightSuper(page) &&
                await forest(page) &&
                await challage(page) &&
                await baseFight(page);
            if (!allSkiped) {
                await sleep(1000);
                await page.click(HEAL);
                await sleep(500);
                await refresh(page, "heal back to main");
            }
            await sleep(10000);
            loopCount++;
            console.log('END', loopCount);
        } catch (error) {
            await page.goto(url);
            await sleep(1000);
            await login(user, page);
            DEBUG_MODE && console.log(`${user.name}: ${error}`);
        }

    }
}

const main = async () => {
    const browser = await puppeteer.launch({
        headless: !DEBUG_MODE,
        args
    });
    // let test = account.shift();
    // const page = await browser.newPage();
    // await page.setViewport(browserSize);
    // await page.goto(url);
    // await task(test, page);
    account.forEach(async (user) => {
        const page = await browser.newPage();
        await page.setViewport(browserSize);
        await page.goto(url);
        await task(user, page);
    })
    let tabs = await browser.pages();
    await tabs[0].close();
    await sleep(1500)
    console.log(tabs.length);
};

main();