# Copy style: how text in the app should read

Every user-facing string (titles, buttons, help, hints, results, errors, empty states, home descriptions)
follows these rules.

- **Simple English.** Short sentences, everyday words. If a 12-year-old wouldn't say it, rewrite it.
- **Say what it does.** "Guess the country from its flag", not "Test your geography prowess".
- **No AI tells.** Avoid "unleash", "dive into", "elevate", "master", "embark", "seamless", "ultimate",
  "epic", chains of em-dashes, and three-beat slogans ("Command. Conquer. Win.").
- **Buttons are verbs**, with one word per action everywhere:
  | Action | Use | Not |
  |---|---|---|
  | start a round | Play | Start Game, Begin |
  | go again | Play again / Try again | Retry, Restart round |
  | leave a game | Back / Games (shell) | Exit, Return to menu |
  | next item | Next | Continue, Proceed |
  | close help | Got it | OK, Dismiss |
- **Numbers over adjectives.** "60 seconds", "6 guesses left", not "limited time", "a few tries".
- **Feedback is short.** "Right!", "It was Libya.", "New best score!"
- **Help lines** (the `[help]` input of `<app-game-shell>`) are 3–5 short sentences: the goal, the controls,
  and anything surprising.
- **In-world text is the exception.** Parody content that is part of the joke (the fake crypto site and
  cookie legalese in Reject Cookies) may be as overblown as the joke needs. The frame around it may not.
