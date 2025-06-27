import dotenv from "dotenv";
dotenv.config();

import simpleGit from "simple-git";
import jsonfile from "jsonfile";
import moment from "moment";
import fetch from "node-fetch";

const git = simpleGit();

const repoOwner = "your-github-username"; // <-- Change this
const repoName = "your-repo-name"; // <-- Change this
const baseBranch = "main"; // Change if your default branch is not main
const prCount = 3; // Number of PRs you want to create
const filePath = "./data.json"; // File to modify in each commit

// Utility to create a new branch, commit, push and open PR
async function createPR(index) {
  try {
    const timestamp = Date.now();
    const branchName = `auto-pr-${timestamp}-${index}`;
    const commitTime = moment().format("YYYY-MM-DD HH:mm:ss");

    console.log(`\n🛠️ Creating branch: ${branchName}`);

    // Checkout base branch and pull latest
    await git.checkout(baseBranch);
    await git.pull();

    // Create new branch
    await git.checkoutLocalBranch(branchName);

    // Modify file content
    const data = {
      prNumber: index,
      updated: commitTime,
    };
    await jsonfile.writeFile(filePath, data, { spaces: 2 });

    // Stage and commit
    await git.add(filePath);
    await git.commit(`Auto PR #${index} - updated at ${commitTime}`);

    // Push branch
    await git.push("origin", branchName);
    console.log(`🚀 Pushed branch: ${branchName}`);

    // Create Pull Request via GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/pulls`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${process.env.GH_PAT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `Auto PR #${index}`,
          head: branchName,
          base: baseBranch,
          body: `This pull request was automatically created at ${commitTime}.`,
        }),
      }
    );

    const result = await response.json();

    if (result.html_url) {
      console.log(`✅ Pull Request created: ${result.html_url}`);
    } else {
      console.error(`❌ Failed to create PR #${index}:`, result);
    }

    // Checkout back to base branch for next iteration
    await git.checkout(baseBranch);
  } catch (error) {
    console.error("Error in createPR:", error);
  }
}

async function main() {
  console.log("Starting auto PR creation...");
  for (let i = 1; i <= prCount; i++) {
    await createPR(i);
  }
  console.log("All PRs processed.");
}

main();
