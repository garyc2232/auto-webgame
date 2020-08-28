"use struct";
const puppeteer = require('puppeteer');
const {
    url,
    account,
    config
} = require("./config.json");
const DEBUG_MODE = false;
const browserSize = {
    width: 1920 / 2,
    height: 1000
};
const args = [];
// args.push(`--window-size=${browserSize.width},${browserSize.height}`);
args.push('--disable-setuid-sandbox');
args.push('--no-sandbox');
args.push('--disable-gpu');


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
const withdrawMoney = async (page) => {
    await page.waitForSelector(BANK, {
        visible: true,
    });
    await page.click(BANK);
    await page.waitForSelector("font > b", {
        visible: true,
    });
    const moneyInBank = await page.evaluate(async () => {
        const b = document.querySelectorAll("font > b")[1];
        return Math.floor(b.innerHTML / 100)
    })
    const withdraw = "input[name=dasu]";
    await page.waitForSelector(withdraw);
    await page.focus(withdraw);
    await page.keyboard.type("" + moneyInBank);
    await sleep(10000);
    DEBUG_MODE && console.log(`Withdraw ${moneyInBank}`);
    const btnSaving = "input[value=提款]";
    await page.waitForSelector(btnSaving);
    await page.click(btnSaving);
    await refresh(page, "saving back to main");
    await sleep(500);
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
        await sleep(9000);
        DEBUG_MODE && console.log(`Saved ${currentGold}`);
        const btnSaving = "input[value=存款]";
        await page.waitForSelector(btnSaving);
        await page.click(btnSaving);
    }
    DEBUG_MODE && console.log('saving done');
    await refresh(page, "saving back to main");
    await sleep(500);
}
const fightSuper = async (page, lv) => {
    if (!config.skip_super_at || lv < config.skip_super_at) {
        return true;
    }
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
const maze = async (page) => {
    const btn = `input[value=傳說之旅]`;
    await page.waitForSelector(btn, {
        visible: true,
    });
    await page.click(btn);
    await backToMain(page);
}
const backToMain = async (page) => {
    const btnBack = "input[type=submit]";
    await page.waitForSelector(btnBack, {
        visible: true,
    });
    await page.click(btnBack)
};
const refresh = async (page, txt = 'refresh') => {
    await page.waitFor(500);
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
        await page.waitForSelector(CHALLENGE, {
            visible: true
        });
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

const logInfo = async (page) => {
    const info = await page.evaluate(() => {
        const tds = document.querySelectorAll("td")
        let lvLabel = [...tds].filter(td => td.innerText == '等級');
        let jobRoleLabel = [...tds].filter(td => td.innerText == '職業');
        return {
            lv: lvLabel[0].nextSibling.innerHTML * 1,
            job: jobRoleLabel[0].nextElementSibling.innerHTML
        }
    })
    await page.waitForSelector(BANK, {
        visible: true,
    });
    await page.click(BANK);
    await page.waitForSelector("font > b", {
        visible: true,
    });
    const gold = await page.evaluate(async () => {
        const b = document.querySelectorAll("font > b");
        return b[0].innerHTML - -b[1].innerHTML
    })
    info.money = gold;
    await refresh(page, "info back to main");
    await sleep(1000);
    return info;
}

const login = async (user, page) => {
    console.log('Trying to login ', user.name, user.login);
    const loginName = "input[name=id]";
    const password = "input[name=pass]";
    await page.setDefaultTimeout(20000);
    await page.waitFor(1000);
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

const forest = async (page, lv) => {
    if (lv < config.skip_task_at) {
        return true;
    }
    DEBUG_MODE && console.log('forest chk');

    if (!await isVisible(`div.count-mori.count > span.msg`, page)) {
        await savingMoney(page);
        DEBUG_MODE && console.log('forest start');
        await page.waitForSelector(`div.count-mori.count > input[type=submit]`, {
            visible: true,
        });
        await page.click(`div.count-mori.count > input[type=submit]`);
        const btnBack = "button.btn.btn-primary.btn-back";
        await page.setDefaultTimeout(6000);
        while (true) {
            DEBUG_MODE && console.log("forest go");
            await sleep(2000);
            try {
                if (await page.$(FOREST) !== null) {

                    await page.waitForSelector(`${FOREST} > input[type=submit]`, {
                        visible: true,
                    });
                    await page.click(`${FOREST} > input[type=submit]`);
                } else {
                    DEBUG_MODE && console.log('end');
                    await page.waitForSelector(`input[type=submit]`, {
                        visible: true,
                    });
                    await page.setDefaultTimeout(20000);
                    await page.click(`input[type=submit]`);
                    break;
                }
            } catch (error) {
                if (await page.$(btnBack) !== null) {
                    DEBUG_MODE && console.log('你已經筋疲力盡！！');
                    await page.waitForSelector(btnBack, {
                        visible: true,
                    });
                    await page.click(btnBack);
                }
            }

        }

        DEBUG_MODE && console.log('forest end');
        return false;
    } else {
        DEBUG_MODE && console.log('forest pass');
        return true;
    }
}

const getInfo = async (page) => {
    return await page.evaluate(() => {
        const tds = document.querySelectorAll("td")
        let lvLabel = [...tds].filter(td => td.innerText == '等級')
        let moneyLabel = [...tds].filter(td => td.innerText == '金錢')
        let jobRoleLabel = [...tds].filter(td => td.innerText == '職業')
        return {
            lv: lvLabel[0].nextSibling.innerHTML * 1,
            money: moneyLabel[0].nextSibling.innerHTML * 1,
            job: jobRoleLabel[0].nextElementSibling.innerHTML
        }
    })
}
const task = async (user, page) => {
    let loopCount = 0;

    await login(user, page);
    let lv = 0;
    while (true) {
        try {
            // console.log('START', user.name);
            await refresh(page);
            await sleep(1000);
            if (loopCount++ % config.print_log_count == 0) {
                let info = await reBorn(user, page);
                lv = info.lv;
            }

            let allSkiped = await fightSuper(page, lv) &&
                await forest(page, lv) &&
                await challage(page) &&
                await baseFight(page) &&
                await maze(page);
            if (!allSkiped) {
                await page.waitForSelector(HEAL, {
                    visible: true,
                });
                await page.click(HEAL);
                await sleep(500);
                await refresh(page, "heal back to main");
            };
            // !(loopCount++ % 200) && await logInfo(user, page, loopCount);
            DEBUG_MODE && console.log('wait 10s');
            await sleep(10000);
            // console.log('END', loopCount);
        } catch (error) {
            if (config.logOnError) {
                await page.screenshot({
                    path: `${Date.now()}_${user.name}.jpg`
                })
                console.log(`${user.name}: ${error}`);
            }
            loopCount = 0;
            await page.goto(url);
            await sleep(1000);
            await login(user, page);
        }

    }
}
const reBorn = async (user, page) => {
    let info = await logInfo(page);
    let d = new Date();

    console.log(`${d.getHours()}:${d.getMinutes()}:${ d.getSeconds()}`, user.name, info);
    if (info.money < config.upgrade_count * 10000) {
        return info;
    }
    console.log('reBorn');

    await page.waitFor(10000);
    await withdrawMoney(page);
    let newJob = info.job === "拳王" ? "皇帝" : "拳王";
    let newJobID = await page.evaluate((newJob) => {
        const options = document.querySelectorAll("select[name=syoku]")[0]
        for (let each of [...options]) {
            if (each.innerHTML.trim() == newJob) {
                return each.value
            }
        }
    }, newJob)
    console.log(newJobID, newJob);
    await page.select('select[name=syoku]', newJobID.toString());
    await page.waitFor(1000);
    await page.click("input[value=轉職]");
    await page.waitFor(1000);
    await page.click("input[value=回個人舞台]");
    await page.waitFor(1000);
    info = await getInfo(page);
    console.log(info);
    if (info.lv === 1) {
        const upgradeTime = Math.floor(info.money / 10000);
        const upgradePage = "form[action='./kunren.cgi'] > input[type=submit]";
        await page.waitForSelector(upgradePage);
        await page.click(upgradePage);
        await page.waitForSelector("select[name=kaisuu]");
        await page.evaluate((upgradeTime) => {
            const options = document.querySelectorAll("select[name=kaisuu]")[0]
            options[0].setAttribute("value", upgradeTime)

        }, upgradeTime)
        await page.waitFor(10000);
        console.log('開始訓練', upgradeTime);
        await page.click("input[value=開始訓練]");
        console.log('完成訓練');
        await sleep(3000);
        await refresh(page, "upgrade back to main");
        await sleep(5000);
    }

    return info;
}
const main = async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args
    });
    for (let user of account) {
        if (!user.enable) {
            continue;
        }
        let page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');
        await page.setViewport(browserSize);
        await page.goto(url);
        task(user, page);
    }
    let tabs = await browser.pages();
    await tabs[0].close();
};

main();