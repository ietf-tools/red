// @vitest-environment nuxt
import { test, expect } from 'vitest'
import type { TypeSenseSearchItem } from './typesense'
import { typeSenseSearchItemToRFCCommon } from './rfc-converters'

type TypesenseSearchResponse = {
  // the actual response has more properties but these are the parts we use
  results: {
    hits: { document: TypeSenseSearchItem; [key: string]: unknown }[]
    [key: string]: unknown
  }[]
}
// Copied directly from the API
const typesenseSearchResponse: TypesenseSearchResponse = {
  results: [
    {
      facet_counts: [
        {
          counts: [
            {
              count: 42,
              highlighted: 'ops - Operations and Management Area',
              value: 'ops - Operations and Management Area'
            },
            {
              count: 19,
              highlighted: 'iesg - Internet Engineering Steering Group',
              value: 'iesg - Internet Engineering Steering Group'
            },
            {
              count: 13,
              highlighted: 'rtg - Routing Area',
              value: 'rtg - Routing Area'
            },
            {
              count: 9,
              highlighted: 'tsv - Transport Area',
              value: 'tsv - Transport Area'
            },
            {
              count: 7,
              highlighted: 'int - Internet Area',
              value: 'int - Internet Area'
            },
            {
              count: 7,
              highlighted: 'art - Applications and Real-Time Area',
              value: 'art - Applications and Real-Time Area'
            },
            {
              count: 6,
              highlighted: 'app - Applications Area',
              value: 'app - Applications Area'
            },
            {
              count: 3,
              highlighted: 'sec - Security Area',
              value: 'sec - Security Area'
            },
            {
              count: 3,
              highlighted:
                'rai - Real-time Applications and Infrastructure Area',
              value: 'rai - Real-time Applications and Infrastructure Area'
            },
            {
              count: 2,
              highlighted: 'wit - Web and Internet Transport',
              value: 'wit - Web and Internet Transport'
            }
          ],
          field_name: 'area.full',
          sampled: false,
          stats: {
            total_values: 10
          }
        },
        {
          counts: [
            {
              count: 16,
              highlighted: 'Al Morton',
              value: 'Al Morton'
            },
            {
              count: 4,
              highlighted: 'Ruediger Geib',
              value: 'Ruediger Geib'
            },
            {
              count: 4,
              highlighted: 'Simon Josefsson',
              value: 'Simon Josefsson'
            },
            {
              count: 4,
              highlighted: 'Jeffrey H. Dunn',
              value: 'Jeffrey H. Dunn'
            },
            {
              count: 4,
              highlighted: 'Cynthia E. Martin',
              value: 'Cynthia E. Martin'
            },
            {
              count: 3,
              highlighted: 'Fred Baker',
              value: 'Fred Baker'
            },
            {
              count: 3,
              highlighted: 'Xiaoqing Zhu',
              value: 'Xiaoqing Zhu'
            },
            {
              count: 3,
              highlighted: 'Robert Sparks',
              value: 'Robert Sparks'
            },
            {
              count: 3,
              highlighted: 'Scott Poretsky',
              value: 'Scott Poretsky'
            },
            {
              count: 3,
              highlighted: 'Len Ciavattone',
              value: 'Len Ciavattone'
            },
            {
              count: 3,
              highlighted: 'Vijay K. Gurbani',
              value: 'Vijay K. Gurbani'
            },
            {
              count: 3,
              highlighted: 'Carlos Pignataro',
              value: 'Carlos Pignataro'
            },
            {
              count: 3,
              highlighted: 'Zaheduzzaman Sarker',
              value: 'Zaheduzzaman Sarker'
            },
            {
              count: 3,
              highlighted: 'Donald E. Eastlake 3rd',
              value: 'Donald E. Eastlake 3rd'
            },
            {
              count: 2,
              highlighted: 'Xing Li',
              value: 'Xing Li'
            },
            {
              count: 2,
              highlighted: 'Rajiv Asati',
              value: 'Rajiv Asati'
            },
            {
              count: 2,
              highlighted: 'Peter Dawes',
              value: 'Peter Dawes'
            },
            {
              count: 2,
              highlighted: 'Jianping Wu',
              value: 'Jianping Wu'
            },
            {
              count: 2,
              highlighted: 'Jeff Parker',
              value: 'Jeff Parker'
            },
            {
              count: 2,
              highlighted: 'Greg Mirsky',
              value: 'Greg Mirsky'
            },
            {
              count: 2,
              highlighted: 'Cyrus Daboo',
              value: 'Cyrus Daboo'
            },
            {
              count: 2,
              highlighted: 'Weiming Wang',
              value: 'Weiming Wang'
            },
            {
              count: 2,
              highlighted: 'Carol Davids',
              value: 'Carol Davids'
            },
            {
              count: 2,
              highlighted: 'Bill Manning',
              value: 'Bill Manning'
            },
            {
              count: 2,
              highlighted: 'Stephan Bosch',
              value: 'Stephan Bosch'
            },
            {
              count: 2,
              highlighted: 'Rajiv Papneja',
              value: 'Rajiv Papneja'
            },
            {
              count: 2,
              highlighted: 'Radia Perlman',
              value: 'Radia Perlman'
            },
            {
              count: 2,
              highlighted: 'Kentaro Ogawa',
              value: 'Kentaro Ogawa'
            },
            {
              count: 2,
              highlighted: 'Gábor Lencse',
              value: 'Gábor Lencse'
            },
            {
              count: 2,
              highlighted: 'Vishwas Manral',
              value: 'Vishwas Manral'
            },
            {
              count: 2,
              highlighted: 'Lucien Avramov',
              value: 'Lucien Avramov'
            },
            {
              count: 2,
              highlighted: 'Joachim Fabini',
              value: 'Joachim Fabini'
            },
            {
              count: 2,
              highlighted: 'Brian Haberman',
              value: 'Brian Haberman'
            },
            {
              count: 2,
              highlighted: 'Matthias Wieser',
              value: 'Matthias Wieser'
            },
            {
              count: 2,
              highlighted: 'Gorry Fairhurst',
              value: 'Gorry Fairhurst'
            },
            {
              count: 2,
              highlighted: 'jhrapp@gmail.com',
              value: 'jhrapp@gmail.com'
            },
            {
              count: 2,
              highlighted: 'Scott O. Bradner',
              value: 'Scott O. Bradner'
            },
            {
              count: 2,
              highlighted: 'Jamal Hadi Salim',
              value: 'Jamal Hadi Salim'
            },
            {
              count: 2,
              highlighted: 'Preethi Natarajan',
              value: 'Preethi Natarajan'
            },
            {
              count: 2,
              highlighted: 'Fernando Calabria',
              value: 'Fernando Calabria'
            },
            {
              count: 2,
              highlighted: 'Barry Constantine',
              value: 'Barry Constantine'
            },
            {
              count: 2,
              highlighted: 'William A. Simpson',
              value: 'William A. Simpson'
            },
            {
              count: 2,
              highlighted: 'Jonathan Rosenberg',
              value: 'Jonathan Rosenberg'
            },
            {
              count: 2,
              highlighted: 'Henning Schulzrinne',
              value: 'Henning Schulzrinne'
            },
            {
              count: 2,
              highlighted: 'Evangelos Haleplidis',
              value: 'Evangelos Haleplidis'
            },
            {
              count: 2,
              highlighted: 'Chidambaram Arunachalam',
              value: 'Chidambaram Arunachalam'
            },
            {
              count: 1,
              highlighted: 'Ke Xu',
              value: 'Ke Xu'
            },
            {
              count: 1,
              highlighted: 'Jun Bi',
              value: 'Jun Bi'
            },
            {
              count: 1,
              highlighted: 'Wei Pan',
              value: 'Wei Pan'
            },
            {
              count: 1,
              highlighted: 'Yong Cui',
              value: 'Yong Cui'
            },
            {
              count: 1,
              highlighted: 'Xun Shao',
              value: 'Xun Shao'
            },
            {
              count: 1,
              highlighted: 'Xiao Min',
              value: 'Xiao Min'
            },
            {
              count: 1,
              highlighted: 'Rong Pan',
              value: 'Rong Pan'
            },
            {
              count: 1,
              highlighted: 'Ming Gao',
              value: 'Ming Gao'
            },
            {
              count: 1,
              highlighted: 'Gang Ren',
              value: 'Gang Ren'
            },
            {
              count: 1,
              highlighted: 'Eli Dart',
              value: 'Eli Dart'
            },
            {
              count: 1,
              highlighted: 'Dong Liu',
              value: 'Dong Liu'
            },
            {
              count: 1,
              highlighted: 'Ned Smith',
              value: 'Ned Smith'
            },
            {
              count: 1,
              highlighted: 'Mach Chen',
              value: 'Mach Chen'
            },
            {
              count: 1,
              highlighted: 'John Berg',
              value: 'John Berg'
            },
            {
              count: 1,
              highlighted: 'Jaeil Lee',
              value: 'Jaeil Lee'
            },
            {
              count: 1,
              highlighted: 'David Ros',
              value: 'David Ros'
            },
            {
              count: 1,
              highlighted: 'd.h. cheon',
              value: 'd.h. cheon'
            },
            {
              count: 1,
              highlighted: 'Xuehui Dai',
              value: 'Xuehui Dai'
            },
            {
              count: 1,
              highlighted: 'Wes Beebee',
              value: 'Wes Beebee'
            },
            {
              count: 1,
              highlighted: 'Suyong Eum',
              value: 'Suyong Eum'
            },
            {
              count: 1,
              highlighted: 'Shane Kerr',
              value: 'Shane Kerr'
            },
            {
              count: 1,
              highlighted: 'Mingwei Xu',
              value: 'Mingwei Xu'
            },
            {
              count: 1,
              highlighted: 'Lee Howard',
              value: 'Lee Howard'
            },
            {
              count: 1,
              highlighted: 'Kumiko Ono',
              value: 'Kumiko Ono'
            },
            {
              count: 1,
              highlighted: 'Jiantao Fu',
              value: 'Jiantao Fu'
            },
            {
              count: 1,
              highlighted: 'Jaeho Yoon',
              value: 'Jaeho Yoon'
            },
            {
              count: 1,
              highlighted: 'Greg White',
              value: 'Greg White'
            },
            {
              count: 1,
              highlighted: 'Chris Metz',
              value: 'Chris Metz'
            },
            {
              count: 1,
              highlighted: 'Alex White',
              value: 'Alex White'
            },
            {
              count: 1,
              highlighted: 'Akira Kato',
              value: 'Akira Kato'
            },
            {
              count: 1,
              highlighted: 'Wendy Roome',
              value: 'Wendy Roome'
            },
            {
              count: 1,
              highlighted: 'Varun Singh',
              value: 'Varun Singh'
            },
            {
              count: 1,
              highlighted: 'Thomas Haag',
              value: 'Thomas Haag'
            },
            {
              count: 1,
              highlighted: 'Tal Mizrahi',
              value: 'Tal Mizrahi'
            },
            {
              count: 1,
              highlighted: 'Sungjae Lee',
              value: 'Sungjae Lee'
            },
            {
              count: 1,
              highlighted: 'Shankar Rao',
              value: 'Shankar Rao'
            },
            {
              count: 1,
              highlighted: 'Sarah Banks',
              value: 'Sarah Banks'
            },
            {
              count: 1,
              highlighted: 'Reza Fardid',
              value: 'Reza Fardid'
            },
            {
              count: 1,
              highlighted: 'Paul Aitken',
              value: 'Paul Aitken'
            },
            {
              count: 1,
              highlighted: 'Nico Schwan',
              value: 'Nico Schwan'
            },
            {
              count: 1,
              highlighted: 'Martin Duke',
              value: 'Martin Duke'
            },
            {
              count: 1,
              highlighted: 'Keyur Patel',
              value: 'Keyur Patel'
            },
            {
              count: 1,
              highlighted: 'Jay Karthik',
              value: 'Jay Karthik'
            },
            {
              count: 1,
              highlighted: 'JL. Le Roux',
              value: 'JL. Le Roux'
            },
            {
              count: 1,
              highlighted: 'Howard Yang',
              value: 'Howard Yang'
            },
            {
              count: 1,
              highlighted: 'Daryl Malas',
              value: 'Daryl Malas'
            },
            {
              count: 1,
              highlighted: 'Daniel Dinu',
              value: 'Daniel Dinu'
            },
            {
              count: 1,
              highlighted: 'Aman Shaikh',
              value: 'Aman Shaikh'
            },
            {
              count: 1,
              highlighted: 'Alba Shahin',
              value: 'Alba Shahin'
            },
            {
              count: 1,
              highlighted: 'Xudong Zhang',
              value: 'Xudong Zhang'
            },
            {
              count: 1,
              highlighted: 'Wes Hardaker',
              value: 'Wes Hardaker'
            },
            {
              count: 1,
              highlighted: 'Vincent Roca',
              value: 'Vincent Roca'
            },
            {
              count: 1,
              highlighted: 'Satoru Kanno',
              value: 'Satoru Kanno'
            },
            {
              count: 1,
              highlighted: 'Sarah Heiner',
              value: 'Sarah Heiner'
            },
            {
              count: 1,
              highlighted: 'Sami Boutros',
              value: 'Sami Boutros'
            },
            {
              count: 1,
              highlighted: 'Pierre Lynch',
              value: 'Pierre Lynch'
            },
            {
              count: 1,
              highlighted: 'Nicolas Kuhn',
              value: 'Nicolas Kuhn'
            },
            {
              count: 1,
              highlighted: 'Mingui Zhang',
              value: 'Mingui Zhang'
            },
            {
              count: 1,
              highlighted: 'Mark A. West',
              value: 'Mark A. West'
            },
            {
              count: 1,
              highlighted: 'Linjian Song',
              value: 'Linjian Song'
            },
            {
              count: 1,
              highlighted: 'Joseph Ishac',
              value: 'Joseph Ishac'
            },
            {
              count: 1,
              highlighted: 'Jinesh Doshi',
              value: 'Jinesh Doshi'
            },
            {
              count: 1,
              highlighted: 'Jerome Lacan',
              value: 'Jerome Lacan'
            },
            {
              count: 1,
              highlighted: 'Hyangjin Lee',
              value: 'Hyangjin Lee'
            },
            {
              count: 1,
              highlighted: 'Hemant Singh',
              value: 'Hemant Singh'
            },
            {
              count: 1,
              highlighted: 'Gery Czirjak',
              value: 'Gery Czirjak'
            },
            {
              count: 1,
              highlighted: 'Gareth Tyson',
              value: 'Gareth Tyson'
            },
            {
              count: 1,
              highlighted: 'Chris Donley',
              value: 'Chris Donley'
            },
            {
              count: 1,
              highlighted: 'Balazs Varga',
              value: 'Balazs Varga'
            },
            {
              count: 1,
              highlighted: 'Atsushi Ooka',
              value: 'Atsushi Ooka'
            },
            {
              count: 1,
              highlighted: 'Akbar Rahman',
              value: 'Akbar Rahman'
            },
            {
              count: 1,
              highlighted: 'Adi Masputra',
              value: 'Adi Masputra'
            },
            {
              count: 1,
              highlighted: 'Yaron Sheffer',
              value: 'Yaron Sheffer'
            },
            {
              count: 1,
              highlighted: 'Wesley George',
              value: 'Wesley George'
            },
            {
              count: 1,
              highlighted: 'Vinayak Hegde',
              value: 'Vinayak Hegde'
            },
            {
              count: 1,
              highlighted: 'Scott Fluhrer',
              value: 'Scott Fluhrer'
            },
            {
              count: 1,
              highlighted: 'Sanjay Wadhwa',
              value: 'Sanjay Wadhwa'
            },
            {
              count: 1,
              highlighted: 'Ramdas Machat',
              value: 'Ramdas Machat'
            },
            {
              count: 1,
              highlighted: 'Phil Chimento',
              value: 'Phil Chimento'
            },
            {
              count: 1,
              highlighted: 'Norbert Voigt',
              value: 'Norbert Voigt'
            },
            {
              count: 1,
              highlighted: 'Nalini Elkins',
              value: 'Nalini Elkins'
            },
            {
              count: 1,
              highlighted: 'Naeem Khademi',
              value: 'Naeem Khademi'
            },
            {
              count: 1,
              highlighted: 'Matt Lepinski',
              value: 'Matt Lepinski'
            },
            {
              count: 1,
              highlighted: 'Maryam Tahhan',
              value: 'Maryam Tahhan'
            },
            {
              count: 1,
              highlighted: 'Mark Williams',
              value: 'Mark Williams'
            },
            {
              count: 1,
              highlighted: 'Liviu Pislaru',
              value: 'Liviu Pislaru'
            },
            {
              count: 1,
              highlighted: 'Keiichi Shima',
              value: 'Keiichi Shima'
            },
            {
              count: 1,
              highlighted: 'Henrik Nydell',
              value: 'Henrik Nydell'
            },
            {
              count: 1,
              highlighted: 'Henk Birkholz',
              value: 'Henk Birkholz'
            },
            {
              count: 1,
              highlighted: 'Gilles Forget',
              value: 'Gilles Forget'
            },
            {
              count: 1,
              highlighted: 'Daniel Corujo',
              value: 'Daniel Corujo'
            },
            {
              count: 1,
              highlighted: 'Corey Bonnell',
              value: 'Corey Bonnell'
            },
            {
              count: 1,
              highlighted: 'Chris Boulton',
              value: 'Chris Boulton'
            },
            {
              count: 1,
              highlighted: 'Börje Ohlman',
              value: 'Börje Ohlman'
            },
            {
              count: 1,
              highlighted: 'Bron Gondwana',
              value: 'Bron Gondwana'
            },
            {
              count: 1,
              highlighted: 'Brian Monkman',
              value: 'Brian Monkman'
            },
            {
              count: 1,
              highlighted: 'Brian Hibbard',
              value: 'Brian Hibbard'
            },
            {
              count: 1,
              highlighted: 'Alex Biryukov',
              value: 'Alex Biryukov'
            },
            {
              count: 1,
              highlighted: 'Timmons Player',
              value: 'Timmons Player'
            },
            {
              count: 1,
              highlighted: 'Siva Sivabalan',
              value: 'Siva Sivabalan'
            },
            {
              count: 1,
              highlighted: 'Samir Vapiwala',
              value: 'Samir Vapiwala'
            },
            {
              count: 1,
              highlighted: 'Richard Rabbat',
              value: 'Richard Rabbat'
            },
            {
              count: 1,
              highlighted: 'Meng Weng Wong',
              value: 'Meng Weng Wong'
            },
            {
              count: 1,
              highlighted: 'Masayuki Kanda',
              value: 'Masayuki Kanda'
            },
            {
              count: 1,
              highlighted: 'Kohei Shiomoto',
              value: 'Kohei Shiomoto'
            },
            {
              count: 1,
              highlighted: 'Jerome Moisand',
              value: 'Jerome Moisand'
            },
            {
              count: 1,
              highlighted: 'Hitoshi Asaeda',
              value: 'Hitoshi Asaeda'
            },
            {
              count: 1,
              highlighted: 'Hannes Gredler',
              value: 'Hannes Gredler'
            },
            {
              count: 1,
              highlighted: 'Hadriel Kaplan',
              value: 'Hadriel Kaplan'
            },
            {
              count: 1,
              highlighted: 'Gennaro Boggia',
              value: 'Gennaro Boggia'
            },
            {
              count: 1,
              highlighted: 'Edwin Cordeiro',
              value: 'Edwin Cordeiro'
            },
            {
              count: 1,
              highlighted: "Billy O'Mahony",
              value: "Billy O'Mahony"
            },
            {
              count: 1,
              highlighted: 'Rodrigo Carnier',
              value: 'Rodrigo Carnier'
            },
            {
              count: 1,
              highlighted: 'Philip Guenther',
              value: 'Philip Guenther'
            },
            {
              count: 1,
              highlighted: 'Ilari Liusvaara',
              value: 'Ilari Liusvaara'
            },
            {
              count: 1,
              highlighted: 'Ernesto Ruffini',
              value: 'Ernesto Ruffini'
            },
            {
              count: 1,
              highlighted: 'Emmanuel Lochin',
              value: 'Emmanuel Lochin'
            },
            {
              count: 1,
              highlighted: 'Carsten Schmoll',
              value: 'Carsten Schmoll'
            },
            {
              count: 1,
              highlighted: 'Abigail Surtees',
              value: 'Abigail Surtees'
            },
            {
              count: 1,
              highlighted: 'Victor Kuarsingh',
              value: 'Victor Kuarsingh'
            },
            {
              count: 1,
              highlighted: 'Reinhard Schrage',
              value: 'Reinhard Schrage'
            },
            {
              count: 1,
              highlighted: 'Martin Vigoureux',
              value: 'Martin Vigoureux'
            },
            {
              count: 1,
              highlighted: 'Marius Georgescu',
              value: 'Marius Georgescu'
            },
            {
              count: 1,
              highlighted: 'Francesco Gennai',
              value: 'Francesco Gennai'
            },
            {
              count: 1,
              highlighted: 'Claudio Petrucci',
              value: 'Claudio Petrucci'
            },
            {
              count: 1,
              highlighted: 'Alan Hawrylyshen',
              value: 'Alan Hawrylyshen'
            },
            {
              count: 1,
              highlighted: 'michael ackermann',
              value: 'michael ackermann'
            },
            {
              count: 1,
              highlighted: 'Peter Saint-Andre',
              value: 'Peter Saint-Andre'
            },
            {
              count: 1,
              highlighted: 'Luis M. Contreras',
              value: 'Luis M. Contreras'
            },
            {
              count: 1,
              highlighted: 'Jonathan Detchart',
              value: 'Jonathan Detchart'
            },
            {
              count: 1,
              highlighted: 'Edward J. Birrane',
              value: 'Edward J. Birrane'
            },
            {
              count: 1,
              highlighted: 'Somnath Chatterjee',
              value: 'Somnath Chatterjee'
            },
            {
              count: 1,
              highlighted: 'Sabine Randriamasy',
              value: 'Sabine Randriamasy'
            },
            {
              count: 1,
              highlighted: 'Matthias Wählisch',
              value: 'Matthias Wählisch'
            },
            {
              count: 1,
              highlighted: 'Kostas Pentikousis',
              value: 'Kostas Pentikousis'
            },
            {
              count: 1,
              highlighted: 'Antonella Molinaro',
              value: 'Antonella Molinaro'
            },
            {
              count: 1,
              highlighted: 'Remi Denis-Courmont',
              value: 'Remi Denis-Courmont'
            },
            {
              count: 1,
              highlighted: 'Pedro Andres Aranda',
              value: 'Pedro Andres Aranda'
            },
            {
              count: 1,
              highlighted: 'Dmitry Khovratovich',
              value: 'Dmitry Khovratovich'
            },
            {
              count: 1,
              highlighted: 'Carlos J. Bernardos',
              value: 'Carlos J. Bernardos'
            },
            {
              count: 1,
              highlighted: 'Alexander Steinmitz',
              value: 'Alexander Steinmitz'
            },
            {
              count: 1,
              highlighted: 'Kjetil Torgrim Homme',
              value: 'Kjetil Torgrim Homme'
            },
            {
              count: 1,
              highlighted: 'Juhamatti Kuusisaari',
              value: 'Juhamatti Kuusisaari'
            },
            {
              count: 1,
              highlighted: 'Juan-Carlos Zúñiga',
              value: 'Juan-Carlos Zúñiga'
            },
            {
              count: 1,
              highlighted: 'Joachim Strombergson',
              value: 'Joachim Strombergson'
            },
            {
              count: 1,
              highlighted: 'Carsten Rossenhoevel',
              value: 'Carsten Rossenhoevel'
            },
            {
              count: 1,
              highlighted: 'Dr. Dennis L. Venable',
              value: 'Dr. Dennis L. Venable'
            },
            {
              count: 1,
              highlighted: 'Dimitri Papadimitriou',
              value: 'Dimitri Papadimitriou'
            },
            {
              count: 1,
              highlighted: 'Sergio Mena de la Cruz',
              value: 'Sergio Mena de la Cruz'
            },
            {
              count: 1,
              highlighted: 'Richard "Footer" Foote',
              value: 'Richard "Footer" Foote'
            },
            {
              count: 1,
              highlighted: 'Christopher S. Francis',
              value: 'Christopher S. Francis'
            },
            {
              count: 1,
              highlighted: 'Alessandro Vinciarelli',
              value: 'Alessandro Vinciarelli'
            },
            {
              count: 1,
              highlighted: 'Balamuhunthan Balarajah',
              value: 'Balamuhunthan Balarajah'
            },
            {
              count: 1,
              highlighted: 'Antonio Marcus Moreiras',
              value: 'Antonio Marcus Moreiras'
            }
          ],
          field_name: 'authors.name',
          sampled: false,
          stats: {
            total_values: 268
          }
        },
        {
          counts: [
            {
              count: 139,
              highlighted: 'false',
              value: 'false'
            }
          ],
          field_name: 'flags.hiddenDefault',
          sampled: false,
          stats: {
            total_values: 1
          }
        },
        {
          counts: [
            {
              count: 22,
              highlighted: 'bmwg - Benchmarking Methodology',
              value: 'bmwg - Benchmarking Methodology'
            },
            {
              count: 19,
              highlighted: 'none - Individual Submissions',
              value: 'none - Individual Submissions'
            },
            {
              count: 15,
              highlighted: 'ippm - IP Performance Measurement',
              value: 'ippm - IP Performance Measurement'
            },
            {
              count: 8,
              highlighted: 'sec - Security Area',
              value: 'sec - Security Area'
            },
            {
              count: 5,
              highlighted: 'sieve - Sieve Mail Filtering Language',
              value: 'sieve - Sieve Mail Filtering Language'
            },
            {
              count: 4,
              highlighted: 'int - Internet Area',
              value: 'int - Internet Area'
            },
            {
              count: 4,
              highlighted: 'app - Applications Area',
              value: 'app - Applications Area'
            },
            {
              count: 4,
              highlighted: 'ops - Operations and Management Area',
              value: 'ops - Operations and Management Area'
            },
            {
              count: 3,
              highlighted: 'rmcat - RTP Media Congestion Avoidance Techniques',
              value: 'rmcat - RTP Media Congestion Avoidance Techniques'
            },
            {
              count: 3,
              highlighted:
                'aqm - Active Queue Management and Packet Scheduling',
              value: 'aqm - Active Queue Management and Packet Scheduling'
            },
            {
              count: 2,
              highlighted: 'gen - General Area',
              value: 'gen - General Area'
            },
            {
              count: 2,
              highlighted: 'cfrg - Crypto Forum',
              value: 'cfrg - Crypto Forum'
            },
            {
              count: 2,
              highlighted: 'isis - IS-IS for IP Internets',
              value: 'isis - IS-IS for IP Internets'
            },
            {
              count: 2,
              highlighted: 'mpls - Multiprotocol Label Switching',
              value: 'mpls - Multiprotocol Label Switching'
            },
            {
              count: 2,
              highlighted: 'icnrg - Information-Centric Networking',
              value: 'icnrg - Information-Centric Networking'
            },
            {
              count: 2,
              highlighted: 'insipid - INtermediary-safe SIP session ID',
              value: 'insipid - INtermediary-safe SIP session ID'
            },
            {
              count: 2,
              highlighted: 'pppext - Point-to-Point Protocol Extensions',
              value: 'pppext - Point-to-Point Protocol Extensions'
            },
            {
              count: 2,
              highlighted: 'ccamp - Common Control and Measurement Plane',
              value: 'ccamp - Common Control and Measurement Plane'
            },
            {
              count: 2,
              highlighted: 'forces - Forwarding and Control Element Separation',
              value: 'forces - Forwarding and Control Element Separation'
            },
            {
              count: 2,
              highlighted:
                'sipping - Session Initiation Proposal Investigation',
              value: 'sipping - Session Initiation Proposal Investigation'
            },
            {
              count: 2,
              highlighted:
                'trill - Transparent Interconnection of Lots of Links',
              value: 'trill - Transparent Interconnection of Lots of Links'
            },
            {
              count: 2,
              highlighted:
                'extra - Email mailstore and eXtensions To Revise or Amend',
              value: 'extra - Email mailstore and eXtensions To Revise or Amend'
            },
            {
              count: 1,
              highlighted: 'fax - Internet Fax',
              value: 'fax - Internet Fax'
            },
            {
              count: 1,
              highlighted: '6man - IPv6 Maintenance',
              value: '6man - IPv6 Maintenance'
            },
            {
              count: 1,
              highlighted: 'avt - Audio/Video Transport',
              value: 'avt - Audio/Video Transport'
            },
            {
              count: 1,
              highlighted: 'tcpimpl - TCP Implementation',
              value: 'tcpimpl - TCP Implementation'
            },
            {
              count: 1,
              highlighted: 'ntp - Network Time Protocols',
              value: 'ntp - Network Time Protocols'
            },
            {
              count: 1,
              highlighted: 'rohc - Robust Header Compression',
              value: 'rohc - Robust Header Compression'
            },
            {
              count: 1,
              highlighted: 'detnet - Deterministic Networking',
              value: 'detnet - Deterministic Networking'
            },
            {
              count: 1,
              highlighted: 'sidr - Secure Inter-Domain Routing',
              value: 'sidr - Secure Inter-Domain Routing'
            },
            {
              count: 1,
              highlighted: 'ipfix - IP Flow Information Export',
              value: 'ipfix - IP Flow Information Export'
            },
            {
              count: 1,
              highlighted: 'ospf - Open Shortest Path First IGP',
              value: 'ospf - Open Shortest Path First IGP'
            },
            {
              count: 1,
              highlighted: 'ancp - Access Node Control Protocol',
              value: 'ancp - Access Node Control Protocol'
            },
            {
              count: 1,
              highlighted: 'rats - Remote ATtestation ProcedureS',
              value: 'rats - Remote ATtestation ProcedureS'
            },
            {
              count: 1,
              highlighted: 'ngtrans - Next Generation Transition',
              value: 'ngtrans - Next Generation Transition'
            },
            {
              count: 1,
              highlighted: 'dnsop - Domain Name System Operations',
              value: 'dnsop - Domain Name System Operations'
            },
            {
              count: 1,
              highlighted: 'nfvrg - Network Function Virtualization',
              value: 'nfvrg - Network Function Virtualization'
            },
            {
              count: 1,
              highlighted: 'ccwg - Congestion Control Working Group',
              value: 'ccwg - Congestion Control Working Group'
            },
            {
              count: 1,
              highlighted: 'pkix - Public-Key Infrastructure (X.509)',
              value: 'pkix - Public-Key Infrastructure (X.509)'
            },
            {
              count: 1,
              highlighted: 'sipcore - Session Initiation Protocol Core',
              value: 'sipcore - Session Initiation Protocol Core'
            },
            {
              count: 1,
              highlighted: 'dtn - Delay/Disruption Tolerant Networking',
              value: 'dtn - Delay/Disruption Tolerant Networking'
            },
            {
              count: 1,
              highlighted: 'tcpm - TCP Maintenance and Minor Extensions',
              value: 'tcpm - TCP Maintenance and Minor Extensions'
            },
            {
              count: 1,
              highlighted: 'pmol - Performance Metrics for Other Layers',
              value: 'pmol - Performance Metrics for Other Layers'
            },
            {
              count: 1,
              highlighted: 'alto - Application-Layer Traffic Optimization',
              value: 'alto - Application-Layer Traffic Optimization'
            },
            {
              count: 1,
              highlighted: 'ipsecme - IP Security Maintenance and Extensions',
              value: 'ipsecme - IP Security Maintenance and Extensions'
            },
            {
              count: 1,
              highlighted:
                'dnsind - DNS IXFR, Notification, and Dynamic Update',
              value: 'dnsind - DNS IXFR, Notification, and Dynamic Update'
            },
            {
              count: 1,
              highlighted:
                'behave - Behavior Engineering for Hindrance Avoidance',
              value: 'behave - Behavior Engineering for Hindrance Avoidance'
            },
            {
              count: 1,
              highlighted:
                'appsawg - ART Area General Applications Working Group',
              value: 'appsawg - ART Area General Applications Working Group'
            },
            {
              count: 1,
              highlighted:
                'straw - Sip Traversal Required for Applications to Work',
              value: 'straw - Sip Traversal Required for Applications to Work'
            },
            {
              count: 1,
              highlighted:
                'nwcrg - Coding for efficient NetWork Communications Research Group',
              value:
                'nwcrg - Coding for efficient NetWork Communications Research Group'
            }
          ],
          field_name: 'group.full',
          sampled: false,
          stats: {
            total_values: 50
          }
        },
        {
          counts: [
            {
              count: 3,
              highlighted: '991378800',
              value: '991378800'
            },
            {
              count: 2,
              highlighted: '928220400',
              value: '928220400'
            },
            {
              count: 2,
              highlighted: '678351600',
              value: '678351600'
            },
            {
              count: 2,
              highlighted: '470736000',
              value: '470736000'
            },
            {
              count: 2,
              highlighted: '1428968186',
              value: '1428968186'
            },
            {
              count: 1,
              highlighted: '996649200',
              value: '996649200'
            },
            {
              count: 1,
              highlighted: '967791600',
              value: '967791600'
            },
            {
              count: 1,
              highlighted: '949392000',
              value: '949392000'
            },
            {
              count: 1,
              highlighted: '933490800',
              value: '933490800'
            },
            {
              count: 1,
              highlighted: '920275200',
              value: '920275200'
            },
            {
              count: 1,
              highlighted: '901954800',
              value: '901954800'
            },
            {
              count: 1,
              highlighted: '886320000',
              value: '886320000'
            },
            {
              count: 1,
              highlighted: '873097200',
              value: '873097200'
            },
            {
              count: 1,
              highlighted: '862470000',
              value: '862470000'
            },
            {
              count: 1,
              highlighted: '844153200',
              value: '844153200'
            },
            {
              count: 1,
              highlighted: '820483200',
              value: '820483200'
            },
            {
              count: 1,
              highlighted: '757411200',
              value: '757411200'
            },
            {
              count: 1,
              highlighted: '683708400',
              value: '683708400'
            },
            {
              count: 1,
              highlighted: '562752000',
              value: '562752000'
            },
            {
              count: 1,
              highlighted: '560070000',
              value: '560070000'
            },
            {
              count: 1,
              highlighted: '557478000',
              value: '557478000'
            },
            {
              count: 1,
              highlighted: '549529200',
              value: '549529200'
            },
            {
              count: 1,
              highlighted: '415353600',
              value: '415353600'
            },
            {
              count: 1,
              highlighted: '412934400',
              value: '412934400'
            },
            {
              count: 1,
              highlighted: '1741821321',
              value: '1741821321'
            },
            {
              count: 1,
              highlighted: '1736546587',
              value: '1736546587'
            },
            {
              count: 1,
              highlighted: '1709173109',
              value: '1709173109'
            },
            {
              count: 1,
              highlighted: '1702068644',
              value: '1702068644'
            },
            {
              count: 1,
              highlighted: '1686590770',
              value: '1686590770'
            },
            {
              count: 1,
              highlighted: '1678430453',
              value: '1678430453'
            },
            {
              count: 1,
              highlighted: '1676590382',
              value: '1676590382'
            },
            {
              count: 1,
              highlighted: '1673655796',
              value: '1673655796'
            },
            {
              count: 1,
              highlighted: '1652360112',
              value: '1652360112'
            },
            {
              count: 1,
              highlighted: '1643699080',
              value: '1643699080'
            },
            {
              count: 1,
              highlighted: '1631082753',
              value: '1631082753'
            },
            {
              count: 1,
              highlighted: '1625106908',
              value: '1625106908'
            },
            {
              count: 1,
              highlighted: '1622083272',
              value: '1622083272'
            },
            {
              count: 1,
              highlighted: '1611290318',
              value: '1611290318'
            },
            {
              count: 1,
              highlighted: '1611102234',
              value: '1611102234'
            },
            {
              count: 1,
              highlighted: '1611017434',
              value: '1611017434'
            },
            {
              count: 1,
              highlighted: '1557884228',
              value: '1557884228'
            },
            {
              count: 1,
              highlighted: '1557552720',
              value: '1557552720'
            },
            {
              count: 1,
              highlighted: '1556118347',
              value: '1556118347'
            },
            {
              count: 1,
              highlighted: '1543365079',
              value: '1543365079'
            },
            {
              count: 1,
              highlighted: '1542229540',
              value: '1542229540'
            },
            {
              count: 1,
              highlighted: '1539975232',
              value: '1539975232'
            },
            {
              count: 1,
              highlighted: '1521159048',
              value: '1521159048'
            },
            {
              count: 1,
              highlighted: '1508890637',
              value: '1508890637'
            },
            {
              count: 1,
              highlighted: '1506811705',
              value: '1506811705'
            },
            {
              count: 1,
              highlighted: '1506037039',
              value: '1506037039'
            },
            {
              count: 1,
              highlighted: '1504131514',
              value: '1504131514'
            },
            {
              count: 1,
              highlighted: '1504131512',
              value: '1504131512'
            },
            {
              count: 1,
              highlighted: '1502582266',
              value: '1502582266'
            },
            {
              count: 1,
              highlighted: '1490223486',
              value: '1490223486'
            },
            {
              count: 1,
              highlighted: '1488331192',
              value: '1488331192'
            },
            {
              count: 1,
              highlighted: '1485305330',
              value: '1485305330'
            },
            {
              count: 1,
              highlighted: '1478539247',
              value: '1478539247'
            },
            {
              count: 1,
              highlighted: '1469855873',
              value: '1469855873'
            },
            {
              count: 1,
              highlighted: '1459385693',
              value: '1459385693'
            },
            {
              count: 1,
              highlighted: '1447895731',
              value: '1447895731'
            },
            {
              count: 1,
              highlighted: '1445987828',
              value: '1445987828'
            },
            {
              count: 1,
              highlighted: '1443046823',
              value: '1443046823'
            },
            {
              count: 1,
              highlighted: '1436481795',
              value: '1436481795'
            },
            {
              count: 1,
              highlighted: '1435707473',
              value: '1435707473'
            },
            {
              count: 1,
              highlighted: '1429914105',
              value: '1429914105'
            },
            {
              count: 1,
              highlighted: '1428353213',
              value: '1428353213'
            },
            {
              count: 1,
              highlighted: '1426277577',
              value: '1426277577'
            },
            {
              count: 1,
              highlighted: '1415323998',
              value: '1415323998'
            },
            {
              count: 1,
              highlighted: '1410827071',
              value: '1410827071'
            },
            {
              count: 1,
              highlighted: '1408585598',
              value: '1408585598'
            },
            {
              count: 1,
              highlighted: '1406056025',
              value: '1406056025'
            },
            {
              count: 1,
              highlighted: '1399594184',
              value: '1399594184'
            },
            {
              count: 1,
              highlighted: '1399529979',
              value: '1399529979'
            },
            {
              count: 1,
              highlighted: '1393029212',
              value: '1393029212'
            },
            {
              count: 1,
              highlighted: '1379634502',
              value: '1379634502'
            },
            {
              count: 1,
              highlighted: '1376042770',
              value: '1376042770'
            },
            {
              count: 1,
              highlighted: '1374765875',
              value: '1374765875'
            },
            {
              count: 1,
              highlighted: '1374186406',
              value: '1374186406'
            },
            {
              count: 1,
              highlighted: '1369425546',
              value: '1369425546'
            },
            {
              count: 1,
              highlighted: '1363285005',
              value: '1363285005'
            },
            {
              count: 1,
              highlighted: '1354782283',
              value: '1354782283'
            },
            {
              count: 1,
              highlighted: '1354263868',
              value: '1354263868'
            },
            {
              count: 1,
              highlighted: '1354177563',
              value: '1354177563'
            },
            {
              count: 1,
              highlighted: '1345015409',
              value: '1345015409'
            },
            {
              count: 1,
              highlighted: '1333783303',
              value: '1333783303'
            },
            {
              count: 1,
              highlighted: '1332833280',
              value: '1332833280'
            },
            {
              count: 1,
              highlighted: '1321514037',
              value: '1321514037'
            },
            {
              count: 1,
              highlighted: '1317860301',
              value: '1317860301'
            },
            {
              count: 1,
              highlighted: '1313771643',
              value: '1313771643'
            },
            {
              count: 1,
              highlighted: '1305655075',
              value: '1305655075'
            },
            {
              count: 1,
              highlighted: '1304468377',
              value: '1304468377'
            },
            {
              count: 1,
              highlighted: '1302050081',
              value: '1302050081'
            },
            {
              count: 1,
              highlighted: '1301963244',
              value: '1301963244'
            },
            {
              count: 1,
              highlighted: '1301219247',
              value: '1301219247'
            },
            {
              count: 1,
              highlighted: '1295545895',
              value: '1295545895'
            },
            {
              count: 1,
              highlighted: '1294340873',
              value: '1294340873'
            },
            {
              count: 1,
              highlighted: '1289195412',
              value: '1289195412'
            },
            {
              count: 1,
              highlighted: '1286755903',
              value: '1286755903'
            },
            {
              count: 1,
              highlighted: '1281717516',
              value: '1281717516'
            },
            {
              count: 1,
              highlighted: '1281546933',
              value: '1281546933'
            },
            {
              count: 1,
              highlighted: '1277161052',
              value: '1277161052'
            },
            {
              count: 1,
              highlighted: '1272584209',
              value: '1272584209'
            },
            {
              count: 1,
              highlighted: '1268248693',
              value: '1268248693'
            },
            {
              count: 1,
              highlighted: '1256747596',
              value: '1256747596'
            },
            {
              count: 1,
              highlighted: '1240444101',
              value: '1240444101'
            },
            {
              count: 1,
              highlighted: '1238543827',
              value: '1238543827'
            },
            {
              count: 1,
              highlighted: '1215730990',
              value: '1215730990'
            },
            {
              count: 1,
              highlighted: '1214436435',
              value: '1214436435'
            },
            {
              count: 1,
              highlighted: '1209604637',
              value: '1209604637'
            },
            {
              count: 1,
              highlighted: '1202846373',
              value: '1202846373'
            },
            {
              count: 1,
              highlighted: '1202520211',
              value: '1202520211'
            },
            {
              count: 1,
              highlighted: '1201307740',
              value: '1201307740'
            },
            {
              count: 1,
              highlighted: '1200513151',
              value: '1200513151'
            },
            {
              count: 1,
              highlighted: '1200513105',
              value: '1200513105'
            },
            {
              count: 1,
              highlighted: '1200513088',
              value: '1200513088'
            },
            {
              count: 1,
              highlighted: '1189094127',
              value: '1189094127'
            },
            {
              count: 1,
              highlighted: '1175216234',
              value: '1175216234'
            },
            {
              count: 1,
              highlighted: '1164934722',
              value: '1164934722'
            },
            {
              count: 1,
              highlighted: '1151349078',
              value: '1151349078'
            },
            {
              count: 1,
              highlighted: '1149814474',
              value: '1149814474'
            },
            {
              count: 1,
              highlighted: '1148076227',
              value: '1148076227'
            },
            {
              count: 1,
              highlighted: '1146876117',
              value: '1146876117'
            },
            {
              count: 1,
              highlighted: '1146250506',
              value: '1146250506'
            },
            {
              count: 1,
              highlighted: '1134697431',
              value: '1134697431'
            },
            {
              count: 1,
              highlighted: '1134418320',
              value: '1134418320'
            },
            {
              count: 1,
              highlighted: '1130458869',
              value: '1130458869'
            },
            {
              count: 1,
              highlighted: '1114557813',
              value: '1114557813'
            },
            {
              count: 1,
              highlighted: '1107994632',
              value: '1107994632'
            },
            {
              count: 1,
              highlighted: '1085699448',
              value: '1085699448'
            },
            {
              count: 1,
              highlighted: '1078519948',
              value: '1078519948'
            },
            {
              count: 1,
              highlighted: '1077847706',
              value: '1077847706'
            },
            {
              count: 1,
              highlighted: '1075510197',
              value: '1075510197'
            },
            {
              count: 1,
              highlighted: '1039043062',
              value: '1039043062'
            }
          ],
          field_name: 'publicationDate',
          sampled: false,
          stats: {
            avg: 1253709472.741007,
            max: 1741821321.0,
            min: 412934400.0,
            sum: 174265616711.0,
            total_values: 133
          }
        },
        {
          counts: [
            {
              count: 79,
              highlighted: 'Informational',
              value: 'Informational'
            },
            {
              count: 35,
              highlighted: 'Proposed Standard',
              value: 'Proposed Standard'
            },
            {
              count: 7,
              highlighted: 'Experimental',
              value: 'Experimental'
            },
            {
              count: 7,
              highlighted: 'Best Current Practice',
              value: 'Best Current Practice'
            },
            {
              count: 6,
              highlighted: 'Unknown',
              value: 'Unknown'
            },
            {
              count: 4,
              highlighted: 'Historic',
              value: 'Historic'
            },
            {
              count: 1,
              highlighted: 'Draft Standard',
              value: 'Draft Standard'
            }
          ],
          field_name: 'status.name',
          sampled: false,
          stats: {
            total_values: 7
          }
        },
        {
          counts: [
            {
              count: 112,
              highlighted: 'IETF',
              value: 'IETF'
            },
            {
              count: 15,
              highlighted: 'Legacy',
              value: 'Legacy'
            },
            {
              count: 6,
              highlighted: 'ISE',
              value: 'ISE'
            },
            {
              count: 6,
              highlighted: 'IRTF',
              value: 'IRTF'
            }
          ],
          field_name: 'stream.name',
          sampled: false,
          stats: {
            total_values: 4
          }
        }
      ],
      found: 139,
      hits: [
        {
          document: {
            abstract:
              'This document provides a set of standard Public Key Cryptography (PKC) test keys that may be used wherever pre-generated keys and associated operations like digital signatures are required. Like the European Institute for Computer Antivirus Research (EICAR) virus test and the Generic Test for Unsolicited Bulk Email (GTUBE) spam test files, these publicly known test keys can be detected and recognised by applications consuming them as being purely for testing purposes without assigning any security properties to them.',
            adName: 'Paul Wouters',
            area: {
              acronym: 'iesg',
              full: 'iesg - Internet Engineering Steering Group',
              name: 'Internet Engineering Steering Group'
            },
            authors: [
              {
                affiliation: 'University of Auckland',
                name: 'Peter Gutmann'
              },
              {
                affiliation: 'DigiCert',
                name: 'Corey Bonnell'
              }
            ],
            date: 1702068644,
            filename: 'rfc9500',
            flags: {
              obsoleted: false,
              updated: false
            },
            group: {
              acronym: 'sec',
              full: 'sec - Security Area',
              name: 'Security Area'
            },
            id: 'doc-131284',
            keywords: [],
            pages: 28,
            publicationDate: 1702068644,
            ranking: 9500,
            rfc: '9500',
            rfcNumber: 9500,
            state: ['Published'],
            status: {
              name: 'Informational',
              slug: 'inf'
            },
            stream: {
              name: 'IETF',
              slug: 'ietf'
            },
            subseries: {},
            title: 'Standard Public Key Cryptography (PKC) Test Keys',
            type: 'rfc'
          },
          highlight: {
            abstract: {
              matched_tokens: ['test'],
              snippet:
                'Public Key Cryptography (PKC) <mark>test</mark> keys that may be'
            },
            title: {
              matched_tokens: ['Test'],
              snippet:
                'Standard Public Key Cryptography (PKC) <mark>Test</mark> Keys'
            }
          },
          highlights: [
            {
              field: 'abstract',
              matched_tokens: ['test'],
              snippet:
                'Public Key Cryptography (PKC) <mark>test</mark> keys that may be'
            },
            {
              field: 'title',
              matched_tokens: ['Test'],
              snippet:
                'Standard Public Key Cryptography (PKC) <mark>Test</mark> Keys'
            }
          ],
          text_match: 578730123365187698,
          text_match_info: {
            best_field_score: '1108091338752',
            best_field_weight: 14,
            fields_matched: 2,
            num_tokens_dropped: 0,
            score: '578730123365187698',
            tokens_matched: 1,
            typo_prefix_score: 0
          }
        },
        {
          document: {
            abstract:
              'This document provides test vectors to validate implementations of the two mandatory authentication algorithms specified for the TCP Authentication Option over both IPv4 and IPv6. This includes validation of the key derivation function (KDF) based on a set of test connection parameters as well as validation of the message authentication code (MAC). Vectors are provided for both currently required pairs of KDF and MAC algorithms: KDF_HMAC_SHA1 and HMAC- SHA-1-96, and KDF_AES_128_CMAC and AES-128-CMAC-96. The vectors also validate both whole TCP segments as well as segments whose options are excluded for middlebox traversal.',
            adName: 'Martin Duke',
            area: {
              acronym: 'wit',
              full: 'wit - Web and Internet Transport',
              name: 'Web and Internet Transport'
            },
            authors: [
              {
                affiliation: 'Independent consultant',
                name: 'Dr. Joseph D. Touch'
              },
              {
                affiliation: 'Infinera',
                name: 'Juhamatti Kuusisaari'
              }
            ],
            date: 1706170692,
            filename: 'rfc9235',
            flags: {
              obsoleted: false,
              updated: false
            },
            group: {
              acronym: 'tcpm',
              full: 'tcpm - TCP Maintenance and Minor Extensions',
              name: 'TCP Maintenance and Minor Extensions'
            },
            id: 'doc-131034',
            keywords: [],
            pages: 25,
            publicationDate: 1652360112,
            ranking: 9235,
            rfc: '9235',
            rfcNumber: 9235,
            state: ['Published'],
            status: {
              name: 'Informational',
              slug: 'inf'
            },
            stream: {
              name: 'IETF',
              slug: 'ietf'
            },
            subseries: {},
            title: 'TCP Authentication Option (TCP-AO) Test Vectors',
            type: 'rfc'
          },
          highlight: {
            abstract: {
              matched_tokens: ['test'],
              snippet:
                'This document provides <mark>test</mark> vectors to validate implementations'
            },
            title: {
              matched_tokens: ['Test'],
              snippet:
                'TCP Authentication Option (TCP-AO) <mark>Test</mark> Vectors'
            }
          },
          highlights: [
            {
              field: 'title',
              matched_tokens: ['Test'],
              snippet:
                'TCP Authentication Option (TCP-AO) <mark>Test</mark> Vectors'
            },
            {
              field: 'abstract',
              matched_tokens: ['test'],
              snippet:
                'This document provides <mark>test</mark> vectors to validate implementations'
            }
          ],
          text_match: 578730123365187698,
          text_match_info: {
            best_field_score: '1108091338752',
            best_field_weight: 14,
            fields_matched: 2,
            num_tokens_dropped: 0,
            score: '578730123365187698',
            tokens_matched: 1,
            typo_prefix_score: 0
          }
        },
        {
          document: {
            abstract:
              'The Real-time Transport Protocol (RTP) is a common transport choice for interactive multimedia communication applications. The performance of these applications typically depends on a well-functioning congestion control algorithm. To ensure a seamless and robust user experience, a well-designed RTP-based congestion control algorithm should work well across all access network types. This document describes test cases for evaluating performances of candidate congestion control algorithms over cellular and Wi-Fi networks.',
            adName: 'Mirja Kühlewind',
            area: {
              acronym: 'tsv',
              full: 'tsv - Transport Area',
              name: 'Transport Area'
            },
            authors: [
              {
                affiliation: 'Ericsson AB',
                name: 'Zaheduzzaman Sarker'
              },
              {
                affiliation: 'Cisco Systems',
                name: 'Xiaoqing Zhu'
              },
              {
                affiliation: 'Cisco Systems',
                name: 'Jiantao Fu'
              }
            ],
            date: 1611017434,
            filename: 'rfc8869',
            flags: {
              obsoleted: false,
              updated: false
            },
            group: {
              acronym: 'rmcat',
              full: 'rmcat - RTP Media Congestion Avoidance Techniques',
              name: 'RTP Media Congestion Avoidance Techniques'
            },
            id: 'doc-130673',
            keywords: [],
            pages: 19,
            publicationDate: 1611017434,
            ranking: 8869,
            rfc: '8869',
            rfcNumber: 8869,
            state: ['Published'],
            status: {
              name: 'Informational',
              slug: 'inf'
            },
            stream: {
              name: 'IETF',
              slug: 'ietf'
            },
            subseries: {},
            title:
              'Evaluation Test Cases for Interactive Real-Time Media over Wireless Networks',
            type: 'rfc'
          },
          highlight: {
            abstract: {
              matched_tokens: ['test'],
              snippet:
                'types. This document describes <mark>test</mark> cases for evaluating performances'
            },
            title: {
              matched_tokens: ['Test'],
              snippet:
                'Evaluation <mark>Test</mark> Cases for Interactive Real-Time Media over Wireless Networks'
            }
          },
          highlights: [
            {
              field: 'title',
              matched_tokens: ['Test'],
              snippet:
                'Evaluation <mark>Test</mark> Cases for Interactive Real-Time Media over Wireless Networks'
            },
            {
              field: 'abstract',
              matched_tokens: ['test'],
              snippet:
                'types. This document describes <mark>test</mark> cases for evaluating performances'
            }
          ],
          text_match: 578730123365187698,
          text_match_info: {
            best_field_score: '1108091338752',
            best_field_weight: 14,
            fields_matched: 2,
            num_tokens_dropped: 0,
            score: '578730123365187698',
            tokens_matched: 1,
            typo_prefix_score: 0
          }
        },
        {
          document: {
            abstract:
              'The Real-time Transport Protocol (RTP) is used to transmit media in multimedia telephony applications. These applications are typically required to implement congestion control. This document describes the test cases to be used in the performance evaluation of such congestion control algorithms in a controlled environment.',
            adName: 'Mirja Kühlewind',
            area: {
              acronym: 'tsv',
              full: 'tsv - Transport Area',
              name: 'Transport Area'
            },
            authors: [
              {
                affiliation: 'Ericsson AB',
                name: 'Zaheduzzaman Sarker'
              },
              {
                affiliation: 'Nemu Dialogue Systems Oy',
                name: 'Varun Singh'
              },
              {
                affiliation: 'Cisco Systems',
                name: 'Xiaoqing Zhu'
              },
              {
                affiliation: 'Cisco Systems, Inc.',
                name: 'Michael A. Ramalho'
              }
            ],
            date: 1611102234,
            filename: 'rfc8867',
            flags: {
              obsoleted: false,
              updated: false
            },
            group: {
              acronym: 'rmcat',
              full: 'rmcat - RTP Media Congestion Avoidance Techniques',
              name: 'RTP Media Congestion Avoidance Techniques'
            },
            id: 'doc-130671',
            keywords: [],
            pages: 28,
            publicationDate: 1611102234,
            ranking: 8867,
            rfc: '8867',
            rfcNumber: 8867,
            state: ['Published'],
            status: {
              name: 'Informational',
              slug: 'inf'
            },
            stream: {
              name: 'IETF',
              slug: 'ietf'
            },
            subseries: {},
            title:
              'Test Cases for Evaluating Congestion Control for Interactive Real-Time Media',
            type: 'rfc'
          },
          highlight: {
            abstract: {
              matched_tokens: ['test'],
              snippet:
                'This document describes the <mark>test</mark> cases to be used'
            },
            title: {
              matched_tokens: ['Test'],
              snippet:
                '<mark>Test</mark> Cases for Evaluating Congestion Control for Interactive Real-Time Media'
            }
          },
          highlights: [
            {
              field: 'title',
              matched_tokens: ['Test'],
              snippet:
                '<mark>Test</mark> Cases for Evaluating Congestion Control for Interactive Real-Time Media'
            },
            {
              field: 'abstract',
              matched_tokens: ['test'],
              snippet:
                'This document describes the <mark>test</mark> cases to be used'
            }
          ],
          text_match: 578730123365187698,
          text_match_info: {
            best_field_score: '1108091338752',
            best_field_weight: 14,
            fields_matched: 2,
            num_tokens_dropped: 0,
            score: '578730123365187698',
            tokens_matched: 1,
            typo_prefix_score: 0
          }
        },
        {
          document: {
            abstract:
              'This memo presents a problem statement for access rate measurement for test protocols to measure IP Performance Metrics (IPPM). Key rate measurement test protocol aspects include the ability to control packet characteristics on the tested path, such as asymmetric rate and asymmetric packet size.',
            adName: 'Spencer Dawkins',
            area: {
              acronym: 'ops',
              full: 'ops - Operations and Management Area',
              name: 'Operations and Management Area'
            },
            authors: [
              {
                affiliation: 'AT&T Labs',
                name: 'Al Morton'
              }
            ],
            date: 1444855964,
            filename: 'rfc7497',
            flags: {
              obsoleted: false,
              updated: false
            },
            group: {
              acronym: 'ippm',
              full: 'ippm - IP Performance Measurement',
              name: 'IP Performance Measurement'
            },
            id: 'doc-129322',
            keywords: [],
            pages: 14,
            publicationDate: 1428353213,
            ranking: 7497,
            rfc: '7497',
            rfcNumber: 7497,
            state: ['Published'],
            status: {
              name: 'Informational',
              slug: 'inf'
            },
            stream: {
              name: 'IETF',
              slug: 'ietf'
            },
            subseries: {},
            title:
              'Rate Measurement Test Protocol Problem Statement and Requirements',
            type: 'rfc'
          },
          highlight: {
            abstract: {
              matched_tokens: ['test'],
              snippet:
                'access rate measurement for <mark>test</mark> protocols to measure IP'
            },
            title: {
              matched_tokens: ['Test'],
              snippet:
                'Rate Measurement <mark>Test</mark> Protocol Problem Statement and Requirements'
            }
          },
          highlights: [
            {
              field: 'abstract',
              matched_tokens: ['test'],
              snippet:
                'access rate measurement for <mark>test</mark> protocols to measure IP'
            },
            {
              field: 'title',
              matched_tokens: ['Test'],
              snippet:
                'Rate Measurement <mark>Test</mark> Protocol Problem Statement and Requirements'
            }
          ],
          text_match: 578730123365187698,
          text_match_info: {
            best_field_score: '1108091338752',
            best_field_weight: 14,
            fields_matched: 2,
            num_tokens_dropped: 0,
            score: '578730123365187698',
            tokens_matched: 1,
            typo_prefix_score: 0
          }
        },
        {
          document: {
            abstract:
              'This memo provides the supporting test plan and results to advance RFC 2680, a performance metric RFC defining one-way packet loss metrics, along the Standards Track. Observing that the metric definitions themselves should be the primary focus rather than the implementations of metrics, this memo describes the test procedures to evaluate specific metric requirement clauses to determine if the requirement has been interpreted and implemented as intended. Two completely independent implementations have been tested against the key specifications of RFC 2680.',
            adName: 'Spencer Dawkins',
            area: {
              acronym: 'ops',
              full: 'ops - Operations and Management Area',
              name: 'Operations and Management Area'
            },
            authors: [
              {
                affiliation: 'AT&T Labs',
                name: 'Len Ciavattone'
              },
              {
                affiliation: 'Deutsche Telekom',
                name: 'Ruediger Geib'
              },
              {
                affiliation: 'AT&T Labs',
                name: 'Al Morton'
              },
              {
                affiliation: 'Technical University Darmstadt',
                name: 'Matthias Wieser'
              }
            ],
            date: 1444855964,
            filename: 'rfc7290',
            flags: {
              obsoleted: false,
              updated: false
            },
            group: {
              acronym: 'ippm',
              full: 'ippm - IP Performance Measurement',
              name: 'IP Performance Measurement'
            },
            id: 'doc-129117',
            keywords: [],
            pages: 31,
            publicationDate: 1406056025,
            ranking: 7290,
            rfc: '7290',
            rfcNumber: 7290,
            state: ['Published'],
            status: {
              name: 'Informational',
              slug: 'inf'
            },
            stream: {
              name: 'IETF',
              slug: 'ietf'
            },
            subseries: {},
            title:
              'Test Plan and Results for Advancing RFC 2680 on the Standards Track',
            type: 'rfc'
          },
          highlight: {
            abstract: {
              matched_tokens: ['test'],
              snippet:
                'memo provides the supporting <mark>test</mark> plan and results to'
            },
            title: {
              matched_tokens: ['Test'],
              snippet:
                '<mark>Test</mark> Plan and Results for Advancing RFC 2680 on the Standards Track'
            }
          },
          highlights: [
            {
              field: 'abstract',
              matched_tokens: ['test'],
              snippet:
                'memo provides the supporting <mark>test</mark> plan and results to'
            },
            {
              field: 'title',
              matched_tokens: ['Test'],
              snippet:
                '<mark>Test</mark> Plan and Results for Advancing RFC 2680 on the Standards Track'
            }
          ],
          text_match: 578730123365187698,
          text_match_info: {
            best_field_score: '1108091338752',
            best_field_weight: 14,
            fields_matched: 2,
            num_tokens_dropped: 0,
            score: '578730123365187698',
            tokens_matched: 1,
            typo_prefix_score: 0
          }
        },
        {
          document: {
            abstract:
              'This memo provides the supporting test plan and results to advance RFC 2679 on one-way delay metrics along the Standards Track, following the process in RFC 6576. Observing that the metric definitions themselves should be the primary focus rather than the implementations of metrics, this memo describes the test procedures to evaluate specific metric requirement clauses to determine if the requirement has been interpreted and implemented as intended. Two completely independent implementations have been tested against the key specifications of RFC 2679. This memo also provides direct input for development of a revision of RFC 2679. This document is not an Internet Standards Track specification; it is published for informational purposes.',
            adName: 'Wesley Eddy',
            area: {
              acronym: 'ops',
              full: 'ops - Operations and Management Area',
              name: 'Operations and Management Area'
            },
            authors: [
              {
                affiliation: 'AT&T Labs',
                name: 'Len Ciavattone'
              },
              {
                affiliation: 'Deutsche Telekom',
                name: 'Ruediger Geib'
              },
              {
                affiliation: 'AT&T Labs',
                name: 'Al Morton'
              },
              {
                affiliation: 'Technical University Darmstadt',
                name: 'Matthias Wieser'
              }
            ],
            date: 1444855956,
            filename: 'rfc6808',
            flags: {
              obsoleted: false,
              updated: false
            },
            group: {
              acronym: 'ippm',
              full: 'ippm - IP Performance Measurement',
              name: 'IP Performance Measurement'
            },
            id: 'doc-128647',
            keywords: [],
            pages: 29,
            publicationDate: 1354782283,
            ranking: 6808,
            rfc: '6808',
            rfcNumber: 6808,
            state: ['Published'],
            status: {
              name: 'Informational',
              slug: 'inf'
            },
            stream: {
              name: 'IETF',
              slug: 'ietf'
            },
            subseries: {},
            title:
              'Test Plan and Results Supporting Advancement of RFC 2679 on the Standards Track',
            type: 'rfc'
          },
          highlight: {
            abstract: {
              matched_tokens: ['test'],
              snippet:
                'memo provides the supporting <mark>test</mark> plan and results to'
            },
            title: {
              matched_tokens: ['Test'],
              snippet:
                '<mark>Test</mark> Plan and Results Supporting Advancement of RFC 2679 on the Standards Track'
            }
          },
          highlights: [
            {
              field: 'abstract',
              matched_tokens: ['test'],
              snippet:
                'memo provides the supporting <mark>test</mark> plan and results to'
            },
            {
              field: 'title',
              matched_tokens: ['Test'],
              snippet:
                '<mark>Test</mark> Plan and Results Supporting Advancement of RFC 2679 on the Standards Track'
            }
          ],
          text_match: 578730123365187698,
          text_match_info: {
            best_field_score: '1108091338752',
            best_field_weight: 14,
            fields_matched: 2,
            num_tokens_dropped: 0,
            score: '578730123365187698',
            tokens_matched: 1,
            typo_prefix_score: 0
          }
        },
        {
          document: {
            abstract:
              'This document contains test vectors for the stream cipher RC4. This document is not an Internet Standards Track specification; it is published for informational purposes.',
            adName: 'Sean Turner',
            area: {
              acronym: 'iesg',
              full: 'iesg - Internet Engineering Steering Group',
              name: 'Internet Engineering Steering Group'
            },
            authors: [
              {
                affiliation: 'SecWorks Sweden AB',
                name: 'Joachim Strombergson'
              },
              {
                affiliation: 'Simon Josefsson Datakonsult AB',
                name: 'Simon Josefsson'
              }
            ],
            date: 1444855939,
            filename: 'rfc6229',
            flags: {
              obsoleted: false,
              updated: false
            },
            group: {
              acronym: 'sec',
              full: 'sec - Security Area',
              name: 'Security Area'
            },
            id: 'doc-128086',
            keywords: [],
            pages: 12,
            publicationDate: 1305655075,
            ranking: 6229,
            rfc: '6229',
            rfcNumber: 6229,
            state: ['Published'],
            status: {
              name: 'Informational',
              slug: 'inf'
            },
            stream: {
              name: 'IETF',
              slug: 'ietf'
            },
            subseries: {},
            title: 'Test Vectors for the Stream Cipher RC4',
            type: 'rfc'
          },
          highlight: {
            abstract: {
              matched_tokens: ['test'],
              snippet:
                'This document contains <mark>test</mark> vectors for the stream cipher RC4. This document is not an Internet Standards Track specification; it is published for informational purposes.'
            },
            title: {
              matched_tokens: ['Test'],
              snippet: '<mark>Test</mark> Vectors for the Stream Cipher RC4'
            }
          },
          highlights: [
            {
              field: 'title',
              matched_tokens: ['Test'],
              snippet: '<mark>Test</mark> Vectors for the Stream Cipher RC4'
            },
            {
              field: 'abstract',
              matched_tokens: ['test'],
              snippet:
                'This document contains <mark>test</mark> vectors for the stream cipher RC4. This document is not an Internet Standards Track specification; it is published for informational purposes.'
            }
          ],
          text_match: 578730123365187698,
          text_match_info: {
            best_field_score: '1108091338752',
            best_field_weight: 14,
            fields_matched: 2,
            num_tokens_dropped: 0,
            score: '578730123365187698',
            tokens_matched: 1,
            typo_prefix_score: 0
          }
        },
        {
          document: {
            abstract:
              'This document contains test vectors for the Public-Key Cryptography Standards (PKCS) #5 Password-Based Key Derivation Function 2 (PBKDF2) with the Hash-based Message Authentication Code (HMAC) Secure Hash Algorithm (SHA-1) pseudorandom function. This document is not an Internet Standards Track specification; it is published for informational purposes.',
            adName: 'Sean Turner',
            area: {
              acronym: 'iesg',
              full: 'iesg - Internet Engineering Steering Group',
              name: 'Internet Engineering Steering Group'
            },
            authors: [
              {
                affiliation: 'SJD AB',
                name: 'Simon Josefsson'
              }
            ],
            date: 1444855934,
            filename: 'rfc6070',
            flags: {
              obsoleted: false,
              updated: false
            },
            group: {
              acronym: 'sec',
              full: 'sec - Security Area',
              name: 'Security Area'
            },
            id: 'doc-127935',
            keywords: [],
            pages: 5,
            publicationDate: 1294340873,
            ranking: 6070,
            rfc: '6070',
            rfcNumber: 6070,
            state: ['Published'],
            status: {
              name: 'Informational',
              slug: 'inf'
            },
            stream: {
              name: 'IETF',
              slug: 'ietf'
            },
            subseries: {},
            title:
              'PKCS #5: Password-Based Key Derivation Function 2 (PBKDF2) Test Vectors',
            type: 'rfc'
          },
          highlight: {
            abstract: {
              matched_tokens: ['test'],
              snippet:
                'This document contains <mark>test</mark> vectors for the Public-Key'
            },
            title: {
              matched_tokens: ['Test'],
              snippet:
                'PKCS #5: Password-Based Key Derivation Function 2 (PBKDF2) <mark>Test</mark> Vectors'
            }
          },
          highlights: [
            {
              field: 'title',
              matched_tokens: ['Test'],
              snippet:
                'PKCS #5: Password-Based Key Derivation Function 2 (PBKDF2) <mark>Test</mark> Vectors'
            },
            {
              field: 'abstract',
              matched_tokens: ['test'],
              snippet:
                'This document contains <mark>test</mark> vectors for the Public-Key'
            }
          ],
          text_match: 578730123365187698,
          text_match_info: {
            best_field_score: '1108091338752',
            best_field_weight: 14,
            fields_matched: 2,
            num_tokens_dropped: 0,
            score: '578730123365187698',
            tokens_matched: 1,
            typo_prefix_score: 0
          }
        },
        {
          document: {
            abstract:
              'The Session Traversal Utilities for NAT (STUN) protocol defines several STUN attributes. The content of some of these -- FINGERPRINT, MESSAGE-INTEGRITY, and XOR-MAPPED-ADDRESS -- involve binary-logical operations (hashing, xor). This document provides test vectors for those attributes. This document is not an Internet Standards Track specification; it is published for informational purposes.',
            adName: 'Magnus Westerlund',
            area: {
              acronym: 'tsv',
              full: 'tsv - Transport Area',
              name: 'Transport Area'
            },
            authors: [
              {
                affiliation: 'Nokia',
                name: 'Remi Denis-Courmont'
              }
            ],
            date: 1471072075,
            filename: 'rfc5769',
            flags: {
              obsoleted: false,
              updated: false
            },
            group: {
              acronym: 'behave',
              full: 'behave - Behavior Engineering for Hindrance Avoidance',
              name: 'Behavior Engineering for Hindrance Avoidance'
            },
            id: 'doc-127647',
            keywords: [],
            pages: 11,
            publicationDate: 1272584209,
            ranking: 5769,
            rfc: '5769',
            rfcNumber: 5769,
            state: ['Published'],
            status: {
              name: 'Informational',
              slug: 'inf'
            },
            stream: {
              name: 'IETF',
              slug: 'ietf'
            },
            subseries: {},
            title:
              'Test Vectors for Session Traversal Utilities for NAT (STUN)',
            type: 'rfc'
          },
          highlight: {
            abstract: {
              matched_tokens: ['test'],
              snippet:
                'xor). This document provides <mark>test</mark> vectors for those attributes.'
            },
            title: {
              matched_tokens: ['Test'],
              snippet:
                '<mark>Test</mark> Vectors for Session Traversal Utilities for NAT (STUN)'
            }
          },
          highlights: [
            {
              field: 'title',
              matched_tokens: ['Test'],
              snippet:
                '<mark>Test</mark> Vectors for Session Traversal Utilities for NAT (STUN)'
            },
            {
              field: 'abstract',
              matched_tokens: ['test'],
              snippet:
                'xor). This document provides <mark>test</mark> vectors for those attributes.'
            }
          ],
          text_match: 578730123365187698,
          text_match_info: {
            best_field_score: '1108091338752',
            best_field_weight: 14,
            fields_matched: 2,
            num_tokens_dropped: 0,
            score: '578730123365187698',
            tokens_matched: 1,
            typo_prefix_score: 0
          }
        }
      ],
      out_of: 9665,
      page: 1,
      request_params: {
        collection_name: 'docs',
        first_q: 'test',
        per_page: 10,
        q: 'test'
      },
      search_cutoff: false,
      search_time_ms: 3
    },
    {
      facet_counts: [
        {
          counts: [
            {
              count: 139,
              highlighted: 'false',
              value: 'false'
            },
            {
              count: 25,
              highlighted: 'true',
              value: 'true'
            }
          ],
          field_name: 'flags.hiddenDefault',
          sampled: false,
          stats: {
            total_values: 2
          }
        }
      ],
      found: 164,
      hits: [],
      out_of: 9665,
      page: 1,
      request_params: {
        collection_name: 'docs',
        first_q: 'test',
        per_page: 0,
        q: 'test'
      },
      search_cutoff: false,
      search_time_ms: 0
    }
  ]
}

test('typeSenseSearchItemToRFC', () => {
  const firstResult = typesenseSearchResponse.results[0]
  if (firstResult === undefined) {
    throw Error(`Expected firstResult to be present`)
  }
  const firstHit = firstResult.hits[0]
  if (firstHit === undefined) {
    throw Error(`Expected firstHit to be present`)
  }

  expect(typeSenseSearchItemToRFCCommon(firstHit.document)).matchSnapshot()
})
