import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-reject-cookies-website',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reject-cookies-website.component.html',
  styleUrl: './reject-cookies-website.component.scss',
})
export class RejectCookiesWebSiteComponent {
  year = new Date().getFullYear();

  features = [
    {
      title: 'Moon Button 🚀',
      description: 'Press it. Watch your portfolio disappear into the void.'
    },
    {
      title: 'AI Market Predictions 🤖',
      description: 'Backed by the same tech that powers your toaster.'
    },
    {
      title: 'Rug Pull Insurance 🧻',
      description: 'We promise to only pull half the rug this time.'
    },
    {
      title: 'Hot Wallet, Hotter Takes 🔥',
      description: 'Get financial advice from a 12-year-old on Discord.'
    },
    {
      title: 'Chart Patterns Only a Mother Could Love 📊',
      description: 'Line go up? Line go down? Who knows.'
    },
    {
      title: 'Paper Hands Mode 🧻',
      description: 'Automatically sell whenever you feel slightly nervous.'
    },
    {
      title: 'NFT Garage Sale 🎨',
      description: 'Trade worthless JPEGs for slightly different worthless JPEGs.'
    },
    {
      title: 'Influencer Endorsements 😎',
      description: 'Backed by someone who once met someone who mined Bitcoin in 2011.'
    },
    {
      title: 'Fear & Greed Index Simulator 🎢',
      description: 'Built to induce full emotional whiplash hourly.'
    },
    {
      title: 'Liquidity Mirage 🌫️',
      description: 'Looks deep—until you try to withdraw.'
    }
  ];
}
