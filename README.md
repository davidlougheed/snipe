# SNIPe

<img src="./src/logo_square.svg" alt="SNIPe logo" width="120" height="120" align="right" />

> **S**electing **N**ovel **I**nformative **P**rimer-sets for **e**-DNA

A web tool for optimally choosing eDNA primer pairs to identify a set of taxa.

See SNIPe in action at [https://snipe.dlougheed.com/](https://snipe.dlougheed.com/)!

## Publication

The work done on SNIPe is part of a [paper by Tournayre *et al.*](https://doi.org/10.1002/edn3.590); if you cite SNIPe 
right now, this is what should be cited:

> #### [Enhancing metabarcoding of freshwater biotic communities: A new online tool for primer selection and exploring data from 14 primer pairs.](https://onlinelibrary.wiley.com/doi/10.1002/edn3.590)
> Orianne Tournayre, Haolun Tian, David R. Lougheed, Matthew J.S. Windle, Sheldon Lambert, Jennipher Carter, 
> Zhengxin Sun, Jeff Ridal, Yuxiang Wang, Brian F. Cumming, Shelley E. Arnott, Stephen C. Lougheed. (2024).<br />
> *Environmental DNA*, 6, e590. DOI: [10.1002/edn3.590]

[10.1002/edn3.590]: https://doi.org/10.1002/edn3.590

## Copyright and License Notice

Note that the terms of the license DO NOT apply to anything under the [./datasets](./datasets) folder; for those files,
all rights are reserved by their copyright holders.

The terms of the license also DO NOT apply to the [SNIPe logo](./src/logo_square.svg). The SNIPe logo is © Evelyn 
Lougheed 2024, all rights reserved, and used with permission in this application.

SNIPe (the program) is copyright &copy; 2023-2024 David Lougheed ([david.lougheed@gmail.com](mailto:david.lougheed@gmail.com))

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.


## Development

First, ensure you have NodeJS 20+ installed.

Then, to get the tool set up in a development environment, the following should be sufficient:

```bash
npm install  # install dependencies
npm run start  # start the development server
```
