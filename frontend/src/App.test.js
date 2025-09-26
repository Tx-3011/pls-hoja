import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('@kanaries/graphic-walker', () => ({
  GraphicWalker: () => <div data-testid="graphic-walker" />,
}));

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

jest.mock('@mui/x-charts', () => ({
  BarChart: (props) => <div data-testid="bar-chart" {...props} />,
  LineChart: (props) => <div data-testid="line-chart" {...props} />,
}));

describe('App', () => {
  it('renders application header', () => {
    render(<App />);
    expect(screen.getByText(/GraphicWalker Studio/i)).toBeInTheDocument();
  });
});
