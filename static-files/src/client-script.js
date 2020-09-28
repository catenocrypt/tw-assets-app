
const appName = "tw-assets-management";
const clientId = "b9ff96b9717574ee8189";

var token = null;
var loginname = null;
var repo = null;

const gitHub = "https://github.com";
const mainRepoOwner = "trustwallet";
const mainRepoName = "assets";
const mainRepoFullName = mainRepoOwner + "/" + mainRepoName;
const mainRepoUrl = `${gitHub}}/${mainRepoFullName}.git`;
const appScopes = "public_repo%20read:user";
const prBodyFooter = `\n\nPR created by ${appName}`;

function loginActionUrl() {
    return `${gitHub}/login/oauth/authorize?scope=${appScopes}&client_id=${clientId}`;
}

function authHeaders() {
    return { authorization: `token ${token}` };
}

async function getUser() {
    const result = await request("GET /user", { headers: authHeaders() });
    return result.data;
}

function refreshUser() {
    document.getElementById("user").innerHTML = "-";

    if (!token) {
        document.getElementById("user").innerHTML = `Not logged in, <a href="${loginActionUrl()}">log in</a>`;
        return;
    }
    var html = `user: <a href="${gitHub}/${loginname}/" target="_blank">${loginname}</a>\n`;
    if (!repo) {
        html += `No fork of assets found for user ${loginname}.  Please fork the <a href="${mainRepoUrl}" target="_blank">main Assets repo</a>\n`;
    } else {
        html += `repo: <a href="${gitHub}/${loginname}/${repo}.git" target="_blank">${loginname}/${repo}</a>\n`;
    }
    html += `<a href="#" onclick="logout();">Logout</a>\n`;

    document.getElementById("user").innerHTML = html;
}

async function checkUser() {
    if (!token) {
        return false;
    }
    const user = await getUser();
    if (!user || !user.login) {
        return false;
    }
    loginname = user.login;
    return true;
}

async function clearInput() {
    document.getElementById("contract").value = "";
    document.getElementById("name").value = "";
    document.getElementById("input.type").value = "ERC20";
    inputLogoSetStream(null, null, 0, null);
    document.getElementById("website").value = "";
    document.getElementById("short_description").value = "";
    document.getElementById("explorer").value = "";
    await tokenInputChanged();
}

async function clearUser() {
    token = null;
    loginname = null;
    repo = null;
    document.getElementById("log").value = "";
    await clearInput();
}

async function logout() {
    await clearUser();
    refreshUser();
}

async function getUserRepos() {
    const result = await request("GET /user/repos", { headers: authHeaders() });
    return result.data;
}

async function getRepo(owner, repo) {
    const result = await request("GET /repos/:owner/:repo", {
        headers: authHeaders(),
        owner: owner,
        repo: repo
    });
    return result.data;
}

async function checkRepo() {
    if (!token || !loginname) {
        return;
    }
    const repos = await getUserRepos();
    if (!repos || repos.length == 0) {
        return false;
    }
    // first try under 'assets' name
    for (const r of repos) {
        if (!repo && r.fork && r.name === mainRepoName) {
            const r2 = await getRepo(loginname, r.name);
            if (r2 && r2.parent && r2.parent.full_name === mainRepoFullName) {
                repo = r.name;
            }
        }
    }
    // try again all others
    for (const r of repos) {
        if (!repo && r.fork) {
            const r2 = await getRepo(loginname, r.name);
            if (r2 && r2.parent && r2.parent.full_name === mainRepoFullName) {
                repo = r.name;
            }
        }
    }
    if (!repo) {
        return false;
    }
    addLog(`User ${loginname}, fork repo ${repo}`);
    return true;
}

async function getPulls(owner, repo) {
    const result = await request("GET /repos/:owner/:repo/pulls", {
        headers: authHeaders(),
        owner: owner,
        repo: repo
    });
    return result.data;
}

function addLog(message) {
    console.log(message);
    const newvalue = document.getElementById("log").value + message + "\n"
    document.getElementById("log").value = newvalue;
}

function logoImg(size, logoStream, logoUrl, dimmed) {
    let src = logoUrl;
    if (logoStream) {
        // image data inline
        src = "data:image/gif;base64," + logoStream;
    }
    return `<img height="${size}" width="${size}" ${dimmed ? 'style="opacity: 0.6"' : ''} src="${src}"/>`;
}

const logoUrlBtc = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png";
const logoUrlTwt = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/assets/TWT-8C2/logo.png";
const logoUrlBnb = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png";
const logoUrlEth = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png";

function logoPreviewHtml(logoStream, logoUrl, smallOnly) {
    var h = '';
    h += `<table><tr>`;
    h += `<td><table>`;
    h += `<tr><td style="padding: 5">${logoImg(32, null, logoUrlBtc, true)}</td></tr>`;
    h += `<tr><td style="padding: 5">${logoImg(32, null, logoUrlTwt, true)}</td></tr>`;
    h += `<tr><td style="padding: 5">${logoImg(32, logoStream, logoUrl, false)}</td></tr>`;
    h += `<tr><td style="padding: 5">${logoImg(32, null, logoUrlBnb, true)}</td></tr>`;
    h += `<tr><td style="padding: 5">${logoImg(32, null, logoUrlEth, true)}</td></tr>`;
    h += `</table></td>`;
    if (!smallOnly) {
        h += `<td><table>`;
        h += `<tr><td style="padding: 5">${logoImg(64, null, logoUrlBtc, true)}</td></tr>`;
        h += `<tr><td style="padding: 5">${logoImg(64, logoStream, logoUrl, false)}</td></tr>`;
        h += `<tr><td style="padding: 5">${logoImg(64, null, logoUrlBnb, true)}</td></tr>`;
        h += `</table></td>`;
        h += `<td><table>`;
        h += `<tr><td style="padding: 5">${logoImg(128, logoStream, logoUrl, false)}</td></tr>`;
        h += `</table></td>`;
        h += `</tr></table>`;
    }
    return h;
}

async function loadLogo(stream, url) {
    document.getElementById("logo-preview-light").innerHTML = logoPreviewHtml(stream, url, true);
    document.getElementById("logo-preview-dark").innerHTML = logoPreviewHtml(stream, url, false);
}

let tokenInput = null;
let tokenInfo = null;

async function loadTokenInfo() {
    document.getElementById("info.type").innerText = tokenInfo.type;
    document.getElementById("info.contract").innerText = tokenInfo.contract;
    await loadLogo(tokenInfo.logoStream, tokenInfo.logoUrl);
    document.getElementById("info.info").value = tokenInfo.infoString;
    let links = "";
    if (tokenInfo.logoUrl) {
        links += `<a href="${tokenInfo.logoUrl}" target="_blank">Logo</a> `;
    } else {
        links += "(logo) ";
    }
    if (tokenInfo.infoUrl) {
        links += `<a href="${tokenInfo.infoUrl}" target="_blank">Info</a> `;
    } else {
        links += "(info) ";
    }
    const explorer = tokenInfo.explorerUrl();
    if (explorer) {
        links += `<a href="${explorer}" target="_blank">Explorer</a> `;
    } else {
        links += "(explorer) ";
    }
    document.getElementById("info.links").innerHTML = links;
}

async function checkAndRefreshTokenInfo() {
    await checkInput();
    tokenInfo = tokenInput.toTokenInfo();
    await loadTokenInfo();
}

async function tokenInputChanged() {
    refreshTokenInputFromUI();
    await checkAndRefreshTokenInfo();
}

const testLogoUrls = [
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x47F32f9eBFc49a1434eB6190d5D8a80A2Dc36af5/logo.png",
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x9B9087756eCa997C5D595C840263001c9a26646D/logo.png",
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xd4c435F5B09F855C3317c8524Cb1F586E42795fa/logo.png",
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x86876a5fCAcb52a197f194A2c8b2166Af327a6da/logo.png",
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xD5525D397898e5502075Ea5E830d8914f6F0affe/logo.png"
];
var testLogoIndex = 0;

function inputLogoSetStream(stream, hintName, hintSize, hintMime) {
    if (!tokenInput) {
        tokenInput = new assetsLib.TokenInput();
    }
    if (!stream) {
        tokenInput.logoStream = null;
        tokenInput.logoStreamSize = 0;
        tokenInput.logoStreamType = null;
        document.getElementById("input.logo-input").innerHTML = "(no image)";
        return;
    }
    tokenInput.logoStream = stream;
    let text = "(";

    tokenInput.logoStreamSize = 0;
    if (hintSize && hintSize > 0) {
        tokenInput.logoStreamSize = hintSize;
        text += `${hintSize} bytes`;
    } else {
        text += `${tokenInput.logoStream.length} base64 bytes`;
    }
    if (hintName) {
        text += `, ${hintName}`;
    }
    tokenInput.logoStreamType = "";
    if (hintMime) {
        tokenInput.logoStreamType = hintMime;
        text += `, ${hintMime}`;
    }

    text += ")";
    document.getElementById("input.logo-input").innerHTML = text;
}

async function debugTestLogoGetNext() {
    testLogoIndex = (testLogoIndex + 1) % testLogoUrls.length;
    const [streamArray, mime] = await logoStreamFromUrl(testLogoUrls[testLogoIndex]);
    const stream = arrayBufferToBase64(streamArray);
    inputLogoSetStream(stream, "test" + testLogoIndex, streamArray.byteLength, mime);
}

async function getPrFiles(prNum) {
    const url = `https://api.github.com/repos/${mainRepoFullName}/pulls/${prNum}/files`;
    let resp = await fetch(url);
    if (resp.status != 200) {
        myAlert(`Error from ${url}, status ${resp.status} ${resp.statusText}`);
        return [];
    }
    const respJson = await resp.json();
    const files = respJson.map(e => e.filename);
    return files;
}

async function loadOpenPrs() {
    const pulls = await getPulls(mainRepoOwner, mainRepoName);
    var html = "";
    pulls.forEach(pr => html += `<option value='${JSON.stringify(pr, null, 2)}''>${pr.number} ${pr.title}</option>`);
    document.getElementById("prs.result").innerHTML = html;
    document.getElementById("prs.count").innerHTML = `${pulls.length} PRs`;
}

function clearTokenInfo() {
    tokenInfo = new assetsLib.TokenInfo();
}

async function loadSelectedPrButton() {
    const prInfo = JSON.parse(document.getElementById("prs.result").value);
    if (!prInfo) {
        return;
    }
    clearTokenInfo();
    prInfo.owner = prInfo.head.user.login;
    prInfo.repo = prInfo.head.repo.name;
    prInfo.branch = prInfo.head.ref;
    console.log(`PR ${prInfo.number}: ${prInfo.owner}/${prInfo.repo}/${prInfo.branch}`);

    document.getElementById("pr-info.title").innerHTML = `<a href="${gitHub}/${mainRepoFullName}/pull/${prInfo.number}" target="_blank" rel="noopener noreferrer"><strong>PR #${prInfo.number}</strong></a>: ${prInfo.title}`;
    document.getElementById("pr-info.repo").innerHTML = `<a href="${gitHub}/${prInfo.owner}/${prInfo.repo}" target="_blank" rel="noopener noreferrer">${prInfo.owner}/${prInfo.repo}</a>/${prInfo.branch}`;

    document.getElementById("pr-info.tokens").innerHTML = "";
    const files = await getPrFiles(prInfo.number);
    if (!files || files.length == 0) {
        myAlert(`Could not retrieve files from PR ${prInfo.number}`);
        return;
    }
    const ids = assetsLib.tokenIdsFromFiles(files);
    if (!ids || ids.length == 0) {
        myAlert(`Could not retrieve tokens from PR ${prInfo.number}`);
        return;
    }
    let html = "";
    ids.forEach(id => {
        let contractInfo = prInfo;
        const type = id[0];
        const contract = id[1];
        contractInfo["type"] = type;
        contractInfo["id"] = contract;
        html += `<option value='${JSON.stringify(contractInfo, null, 2)}'>${type}: ${contract})</option>`;
    });
    document.getElementById("pr-info.tokens").innerHTML = html;
    // load first
    if (ids && ids.length >= 1) {
        const ti = await assetsLib.tokenInfoOfExistingTokenInRepo(ids[0][0], ids[0][1], prInfo.owner, prInfo.repo, prInfo.branch, true);
        if (ti) {
            tokenInfo = ti;
        }
    }
    await loadTokenInfo();
}

async function loadTokensFromPr() {
    const contract = JSON.parse(document.getElementById("pr-info.tokens").value);
    const ti = await assetsLib.tokenInfoOfExistingTokenInRepo(contract.type, contract.id, contract.owner, contract.repo, contract.branch, true);
    if (ti) {
        tokenInfo = ti;
        await loadTokenInfo();
    }
}

async function getBranchRef(branch) {
    const result = await request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
        headers: authHeaders(),
        owner: loginname,
        repo: repo,
        ref: "heads/" + branch
    });
    return result.data.object.sha;
}

async function createBranch(branchName) {
    const ref = await getBranchRef("master");
    const result = await request("POST /repos/:owner/:repo/git/refs", {
        headers: authHeaders(),
        owner: loginname,
        repo: repo,
        ref: `refs/heads/${branchName}`,
        sha: ref
    });
    return result.data.ref;
}

async function createPull(branchName, tokenName, debugPrTargetFork) {
    const title = `Add ${tokenName}`;
    var owner1 = mainRepoOwner;
    var repo1 = mainRepoName;
    if (debugPrTargetFork) {
        owner1 = loginname;
        repo1 = repo;
    }
    const result = await request("POST /repos/:owner/:repo/pulls", {
        headers: authHeaders(),
        owner: owner1,
        repo: repo1,
        title: title,
        head: loginname + ":" + branchName,
        base: "master",
        body: `Info for token ${tokenName} is added.` + "\n\n" + prBodyFooter,
        maintainer_can_modify: true,
        draft: false
    });
    return result.data.number;
}

function newBranchName() {
    const today = new Date();
    const date = (today.getMonth() + 1).toString().padStart(2, '0') + today.getDate().toString().padStart(2, '0') +
        '-' + today.getHours().toString().padStart(2, '0') + today.getMinutes().toString().padStart(2, '0') + today.getSeconds().toString().padStart(2, '0');
    return "br" + date;
}

async function createBlob(content, encoding) {
    const result = await request("POST /repos/:owner/:repo/git/blobs", {
        headers: authHeaders(),
        owner: loginname,
        repo: repo,
        content: content,
        encoding: encoding
    });
    return result.data.sha;
}

// return [ArrayBuffer, content-type]
async function logoStreamFromUrl(testLogoUrl) {
    if (!testLogoUrl) {
        return [null, null];
    }
    const response = await fetch(testLogoUrl);
    if (!response || !response.status == 200) {
        addLog(`Logo stream error ${url}`);
        return [null, null];
    }
    return [await response.arrayBuffer(), response.headers.get('Content-Type')];
}

function arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

async function createFiles(basePath, subFolder, logoContents, infoJsonContent) {
    var fileInfos = [];

    const folder = basePath + "/" + subFolder;

    const logoSha = await createBlob(logoContents, "base64");
    if (!logoSha) {
        return null;
    }
    fileInfos.push({ path: folder + "/logo.png", sha: logoSha, mode: "100644", type: "blob" });

    fileInfos.push({ path: folder + "/info.json", content: infoJsonContent, mode: "100644", type: "blob" });

    return fileInfos;
}

async function createTree(baseSha, fileInfos) {
    const result = await request("POST /repos/:owner/:repo/git/trees", {
        headers: authHeaders(),
        owner: loginname,
        repo: repo,
        tree: fileInfos,
        base_tree: baseSha
    });
    return result.data.sha;
}

async function createCommit(baseSha, tree, tokenName) {
    const result = await request("POST /repos/:owner/:repo/git/commits", {
        headers: authHeaders(),
        owner: loginname,
        repo: repo,
        message: `Adding new token ${tokenName}`,
        tree: tree,
        parents: [baseSha]
    });
    return result.data.sha;
}

async function updateReference(ref, sha) {
    const result = await request("POST /repos/:owner/:repo/git/refs/:ref", {
        headers: authHeaders(),
        owner: loginname,
        repo: repo,
        ref: ref,
        sha: sha
    });
    return result.data.object.sha;
}

const sampleEthContract = "0x6d84682C82526E245f50975190EF0Fff4E4fc077";

async function debugFillWithDummyData() {
    document.getElementById("name").value = "LegumeToken";
    document.getElementById("input.type").value = "ERC20";
    document.getElementById("contract").value = sampleEthContract;
    document.getElementById("website").value = "https://legume.fi";
    document.getElementById("short_description").value = "This is the best-tasting DeFi finance project.";
    document.getElementById("explorer").value = `https://etherscan.io/token/${sampleEthContract}`;
    await debugTestLogoGetNext();
    await tokenInputChanged();
}

function refreshTokenInputFromUI() {
    if (!tokenInput) {
        tokenInput = new assetsLib.TokenInput();
    }
    tokenInput.name = document.getElementById("name").value;
    tokenInput.type = document.getElementById("input.type").value;
    tokenInput.contract = document.getElementById("contract").value;
    tokenInput.website = document.getElementById("website").value;
    tokenInput.explorerUrl = document.getElementById("explorer").value;
    tokenInput.description = document.getElementById("short_description").value;
}

async function myAlert(message) {
    addLog(message);
    alert(message);
}

function createPullError(message) {
    myAlert("PR creation error: " + message);
}

async function createBranchAndPull() {
    if (!loginname) {
        createPullError("Log in first!");
        return;
    }

    if (!tokenInput.contract || !tokenInput.name || !tokenInput.type || !tokenInput.logoStream) {
        createPullError("Fill in all the fields!");
        return;
    }

    const branchName = newBranchName();

    addLog(`name: ${tokenInput.name}  type: ${tokenInput.type}  contract: ${tokenInfo.contract}  branch ${branchName}`);

    const branchRef = await createBranch(branchName);
    if (!branchRef) {
        createPullError(`Could not create branch ${branchName}`);
        return;
    }
    addLog(`Created branch ${loginname}/${repo}/${branchName}`);

    let stream = null;
    if (tokenInfo.logoStream && tokenInfo.logoStream.length > 10) {
        // stream is there, use that
        stream = tokenInfo.logoStream;
    }
    if (!stream) {
        createPullError(`Could not retrieve logo contents`);
        return;
    }

    const chain = assetsLib.chainFromType(tokenInfo.type);
    if (!chain || chain == "unknown") {
        createPullError(`Could not retrieve chain from token type ${tokenInfo.type}`);
        return;
    }
    const fileInfos = await createFiles(`blockchains/${chain}/assets`, tokenInfo.contract, stream, tokenInfo.infoString);
    if (!fileInfos || fileInfos.length == 0) {
        createPullError(`Could not create files`);
        return;
    }
    addLog(`Created ${fileInfos.length} new files`);

    const branchSha = await getBranchRef(branchName);
    if (!branchSha) {
        createPullError(`Could not get ref for branch ${branchName}`);
        return;
    }

    const tree = await createTree(branchSha, fileInfos);
    if (!tree) {
        createPullError(`Could not create tree with files`);
        return;
    }

    const commit = await createCommit(branchSha, tree, name);
    if (!commit) {
        createPullError(`Could not create commit`);
        return;
    }
    addLog(`Created new commit ${commit}`);

    const newBranchSha = await updateReference("heads/" + branchName, commit);
    if (!newBranchSha) {
        createPullError(`Could not update branch ${branchName} to commit ${commit}`);
        return;
    }

    const debugPrTargetFork = !document.getElementsByName("debug-pr-target")[0].checked;
    const pullNumber = await createPull(branchName, tokenInput.name, debugPrTargetFork);  // true for debug
    if (!pullNumber) {
        createPullError(`Could not create PR`);
        return;
    }
    const pullUrl = `${gitHub}/${loginname}/${repo}/pull/${pullNumber}`;
    myAlert(`Created PR ${pullNumber}   ${pullUrl}`);
}

function getTokenQP() {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("token");
}

async function tabSelect(tab) {
    document.getElementById("tab-add").hidden = true;
    document.getElementById("tab-prs").hidden = true;
    document.getElementById("tab-search").hidden = true;
    switch (tab) {
        case "add":
        default:
            document.getElementById("tab-add").hidden = false;
            break;
        case "search":
            document.getElementById("tab-search").hidden = false;
            break;
        case "prs":
            document.getElementById("tab-prs").hidden = false;
            await loadOpenPrs();
            break;
    }
}

async function searchButton() {
    const query = document.getElementById("search.input").value;
    if (query.length < 2) {
        // too short, do not search
        return;
    }
    document.getElementById("search.result").innerHTML = "";
    const coinTypes = "60,195,714,20000714"; // eth, tron, binance, bep20
    const url = `https://api.trustwallet.com/v2/tokens/list?networks=${coinTypes}&query=${query}`;
    let resp = await fetch(url);
    if (resp.status != 200) {
        myAlert(`Error from ${url}, status ${resp.status} ${resp.statusText}`);
        return null;
    }
    const respJson = await resp.json();
    var h = '';
    if (respJson && respJson.docs) {
        respJson.docs.forEach(t => h += `<option value='${JSON.stringify(t)}'>${t.symbol.substring(0, 10)} \t${t.name.substring(0, 20)}    (${t.type.toLowerCase()})</option>`);
    }
    document.getElementById("search.result").innerHTML = h;
}

async function loadSearchResultButton() {
    const token = document.getElementById("search.result").value;
    const tokenJson = JSON.parse(token);
    tokenInfo = await assetsLib.tokenInfoOfExistingToken(tokenJson.type, tokenJson.token_id, true);
    loadTokenInfo();
}

async function logoFileSelected() {
    const file = document.getElementById("input.file-selector").files[0];
    if (file) {
        var reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = async function (evt) {
            var contents = evt.target.result;
            var base64 = arrayBufferToBase64(contents);
            inputLogoSetStream(base64, file.name, file.size, file.type);
            await checkAndRefreshTokenInfo();
        }
        reader.onerror = function (evt) {
            myAlert(`Error reading file ${file.name}`);
        }
    }
}

async function checkInput() {
    // don't display check result if all inputs are emopty
    if (!tokenInput.name && !tokenInput.contract && !tokenInput.logoStream) {
        document.getElementById("input.check-result").value = "";
        document.getElementById("input.check-result").style["color"] = "";
        return "";
    }
    const [error, fixed] = assetsLib.checkTokenInput(tokenInput);
    if (!error) {
        document.getElementById("input.check-result").value = "(check ok)";
        document.getElementById("input.check-result").style["color"] = "";
        return;
    }
    document.getElementById("input.check-result").value = error;
    document.getElementById("input.check-result").style["color"] = "red";
}

async function checkInputButton() {
    await checkInput();
    [error, fixed] = assetsLib.checkTokenInput(tokenInput);
    if (!error) {
        error = "OK";
    }
    myAlert("Check result: " + error);
}

async function start() {
    tabSelect("add");
    await clearUser();
    refreshUser();
    token = getTokenQP();
    if (!await checkUser()) {
        refreshUser();
        return;
    }
    if (!await checkRepo()) {
        refreshUser();
        return;
    }
    refreshUser();
    tokenInputChanged();
}
