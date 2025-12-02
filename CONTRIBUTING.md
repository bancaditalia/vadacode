# Extending Vadacode

:+1::tada: First off, thanks for taking the time to contribute! :tada::+1:

If you want to contribute, navigate to the GitHub "issues" tab and start looking through interesting [Issues page](https://github.com/bancaditalia/vadacode/issues) or propose a new feature. If you decide to start on an issue, leave a comment so that other people know that you're working on it. If you want to help out, but not alone, use the issue comment thread to coordinate.

## Contributing

1. Fork the repository.
2. Create a new branch in your fork: `git checkout -b feature/your-feature-name`
3. Commit your changes and push: `git push origin feature/your-feature-name`
4. Open a Pull Request to the `main` branch of this repo.

Keep in mind:

* Include new test cases (either end-to-end or unit tests) with your change.
* Make sure all tests are still passing.
* Include the license header in all new files.
* End files with a new line.
* Document what you do using comments.
* Make sure your branch is up to date and rebased.
* Squash extraneous commits unless their history truly adds value to the patch.

### Git Commit Messages

Commit messages should adhere to the guidelines in tpope's
[A Note About Git Commit Messages](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)

In short:

* Use the imperative mood. ("Fix bug", not "Fixed bug" or "Fixes bug")
* Limit the first line to 50 characters or less, followed by a blank line
  and detail paragraphs (limit detail lines to about 72 characters).
* Reference issue numbers or pull requests whenever possible.

## Development setup

Set up your development environment by following these steps:

- Run `npm install` in Vadacode root folder. This installs all necessary npm modules in all project folders (client, server, ...).
- Open VS Code on this folder.
- Switch to the Run and Debug View in the Sidebar (Ctrl+Shift+D).
- Select `Launch Client (vadacode)` from the drop down (if it is not already).
- Press ▷ to run the launch config (F5).
	- VSCode starts compiling the client and server in watch mode.
- Work in the Extension Development Host instance of VSCode running Vadacode in Debug mode.
	- Check the Debug Console panel in your development VS Code for runtime errors (from `console.log`).
	- Check the Output panel in the Extension Development Host for runtime errors (from `this.connection.console.log`).

You can find more information at [Vadacode development](https://www.vadalog.org/vadacode-manual/latest/development.html).