import type { ReactNode } from 'react';
import Container, { type ContainerProps } from '@mui/material/Container';
import type { SxProps, Theme } from '@mui/material/styles';

export interface PageContainerProps {
  children: ReactNode;
  maxWidth?: ContainerProps['maxWidth'];
  disableGutters?: boolean;
  sx?: SxProps<Theme>;
}

export function PageContainer({
  children,
  maxWidth = 'lg',
  disableGutters = false,
  sx,
}: PageContainerProps) {
  return (
    <Container
      maxWidth={maxWidth}
      disableGutters={disableGutters}
      sx={{
        py: { xs: 2, sm: 3, md: 4 },
        px: disableGutters ? 0 : { xs: 2, sm: 3 },
        width: '100%',
        ...sx,
      }}
    >
      {children}
    </Container>
  );
}
