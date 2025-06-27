import simpleGit from "simple-git";
import jsonfile from "jsonfile";
import moment from "moment";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const git = simpleGit();
const path = "./data.json";
const repoOwner = "your-username"; // 🔁 Replace with your GitHub username
const repoName = "your-repo"; // 🔁 Replace with your repo name
const totalPRs = 5; // 🔁 Adjust the number of PRs to create

(async () => {
  try {
    await git.checkout("main");
    await git.pull();

    for (let i = 1; i <= totalPRs; i++) {
      const timestamp = Date.now();
      const branchName = `auto-pr-${timestamp}-${i}`;
      const commitTime = moment().format("YYYY-MM-DD HH:mm:ss");

      // Create a new branch
      await git.checkoutLocalBranch(branchName);

      // Modify file
      const data = { prNumber: i, updated: commitTime };
      await jsonfile.writeFile(path, data);
      await git.add(path);
      await git.commit(`Auto PR #${i} at ${commitTime}`);
      await git.push("origin", branchName);

      // Create pull request via GitHub API
      const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/pulls`, {
        method: "POST",
        headers: {
          Authorization: `token ${process.env.GH_PAT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `Auto PR #${i}`,
          head: branchName,
          base: "main",
          body: `This pull request was automatically created at ${commitTime}.`,
        }),
      });

      const result = await response.json();

      if (result.html_url) {
        console.log(`✅ PR #${i} Created: ${result.html_url}`);
      } else {
        console.error(`❌ Failed to create PR #${i}:`, result);
      }

      // Checkout main for next PR loop
      await git.checkout("main");
    }

    console.log("🎉 All PRs created.");
  } catch (err) {
    console.error("🔥 Error:", err);
  }
})();
