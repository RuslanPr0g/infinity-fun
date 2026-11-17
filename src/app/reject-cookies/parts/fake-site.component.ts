import { Component } from '@angular/core';

/** The made-up crypto site behind the cookie banner. In-world look and copy, on purpose. */
@Component({
  selector: 'rc-fake-site',
  standalone: true,
  template: `
    <header class="nav"><b>Crypto<span>Zoo</span></b><nav><a>Markets</a><a>Earn</a><a>Help</a></nav></header>
    <section class="hero">
      <h1>The only place where your coins are unstable!</h1>
      <p>Join 4 people who trust us with their life savings.</p>
      <a class="cta">Buy the dip</a>
    </section>
    <section class="features">
      @for (f of features; track f.title) {
        <article><h2>{{ f.title }}</h2><p>{{ f.text }}</p></article>
      }
    </section>
    <footer>© {{ year }} CryptoZoo. Not financial advice 🧢</footer>
  `,
  styleUrl: './fake-site.component.scss',
})
export class FakeSiteComponent {
  readonly year = new Date().getFullYear();
  readonly features = [
    { title: 'Moon Button 🚀', text: 'Press it. Watch your portfolio vanish into the void.' },
    { title: 'AI Market Predictions 🤖', text: 'Powered by the same tech as your toaster.' },
    { title: 'Rug Pull Insurance 🧻', text: 'We promise to only pull half the rug this time.' },
    { title: 'Hot Wallet, Hotter Takes 🔥', text: 'Money tips from a 12-year-old on Discord.' },
    { title: 'Charts Only a Mother Could Love 📊', text: 'Line go up? Line go down? Who knows.' },
    { title: 'NFT Garage Sale 🎨', text: 'Swap worthless JPEGs for slightly different worthless JPEGs.' },
  ];
}
